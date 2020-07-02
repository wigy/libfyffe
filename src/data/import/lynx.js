const Tx = require('../../tx/Tx');
const { SinglePassImport } = require('../import');
const { cents } = require('../../util/num');

class LynxImport extends SinglePassImport {

  constructor() {
    super('Lynx');
  }

  isMine(content) {
    return /^\sStatement,Header,Field Name,Field Value/.test(content);
  }

  symbol(str) {
    return str.replace(/ PR([A-Z])$/, '-$1');
  }

  num(str) {
    return parseFloat(str.replace(/,/g, ''));
  }

  async load(file) {
    const data = {};
    let header;
    let prefix;
    let body = '';
    // Drop 0xfeff from the string pos 0.
    for (const line of file.substr(1).split('\n')) {
      const same = prefix && line.substr(0, prefix.length) === prefix;
      if (header && same) {
        body += line + '\n';
        continue;
      }
      if (header && !same) {
        data[prefix] = await this.loadCSV(header + '\n' + body);
        header = undefined;
        prefix = undefined;
        body = '';
      }
      if (!header) {
        header = line;
        if (!header) {
          break;
        }
        prefix = line.match(/^([^,]+),/)[1];
        continue;
      }
    }
    delete data.Statement;
    delete data['Account Information'];
    delete data['Net Asset Value'];
    delete data['Change in NAV'];
    delete data['Mark-to-Market Performance Summary'];
    delete data['Realized & Unrealized Performance Summary'];
    delete data['Cash Report'];
    delete data['Open Positions'];
    delete data['Forex Balances'];
    delete data['Change in Dividend Accruals'];
    delete data['Financial Instrument Information'];
    delete data.Codes;
    delete data['Notes/Legal Notes'];

    const interest = await this.parseInterest(data.Interest);
    const trades = await this.parseTrades(data.Trades);
    const forex = await this.parseForex(data.Trades);
    const deposits = await this.parseFunding(data['Deposits & Withdrawals']);
    const taxes = await this.parseTax(data['Withholding Tax']);
    const dividends = await this.parseDividends(data.Dividends, taxes);
    const actions = await this.parseCorporateActions(data['Corporate Actions']);

    return interest.concat(trades).concat(forex).concat(deposits).concat(dividends).concat(actions);
  }

  async parseInterest(data) {
    const ret = [];
    for (const e of data.filter(e => e.Date && e.Amount && e.Header === 'Data')) {
      const rate = await Tx.fetchRate(e.Date, `CURRENCY:${e.Currency}`);
      ret.push({
        currency: e.Currency,
        date: e.Date,
        id: this.makeId('INTEREST', e.Date),
        rate,
        time: e.Date,
        total: cents(-parseFloat(e.Amount) * rate),
        type: 'interest'
      });
    }
    return ret;
  }

  async parseFunding(data) {
    const ret = [];
    for (const e of data.filter(e => e.Settle_Date && e.Amount && e.Header === 'Data')) {
      const q = parseFloat(e.Amount);
      if (q > 0) {
        ret.push({
          date: e.Settle_Date,
          fee: 0.0,
          id: this.makeId('DEPOSIT', e.Date_Time, e.Symbol),
          time: e.Settle_Date,
          total: cents(q),
          type: 'deposit'
        });
      } else {
        ret.push({
          date: e.Settle_Date,
          fee: 0.0,
          id: this.makeId('WITHDRAW', e.Date_Time, e.Symbol),
          time: e.Settle_Date,
          total: cents(-q),
          type: 'withdrawal'
        });
      }
    }
    return ret;
  }

  async parseForex(data) {
    const ret = [];
    for (const e of data.filter(e => e.Asset_Category === 'Forex' && e.Header === 'Data')) {
      const q = this.num(e.Quantity);
      const [cur1, cur2] = e.Symbol.split('.');
      const rate = 1.0 / parseFloat(e.T__Price);
      const fee = cents(-parseFloat(e.Comm_Fee));
      if (q < 0) {
        ret.push({
          amount: q,
          currency: cur1,
          date: e.Date_Time.substr(0, 10),
          fee,
          id: this.makeId('FX-IN', e.Date_Time, e.Symbol),
          rate,
          target: cur2,
          time: e.Date_Time.replace(',', ''),
          total: cents(-q + fee),
          type: 'fx-in'
        });
      } else {
        ret.push({
          amount: q,
          currency: cur1,
          date: e.Date_Time.substr(0, 10),
          fee,
          id: this.makeId('FX-OUT', e.Date_Time, e.Symbol),
          rate,
          target: cur2,
          time: e.Date_Time.replace(',', ''),
          total: cents(q + fee),
          type: 'fx-out'
        });
      }
    }

    return ret;
  }

  async parseTrades(data) {
    const ret = [];
    for (const e of data.filter(e => e.Asset_Category === 'Stocks' && e.Header === 'Data')) {
      const q = this.num(e.Quantity);
      const rate = await Tx.fetchRate(e.Date_Time.substr(0, 10), `CURRENCY:${e.Currency}`);
      if (q < 0) {
        ret.push({
          amount: q,
          currency: e.Currency,
          date: e.Date_Time.substr(0, 10),
          fee: cents(-parseFloat(e.Comm_Fee) * rate),
          id: this.makeId('SELL', e.Date_Time, e.Symbol),
          rate,
          target: this.symbol(e.Symbol),
          time: e.Date_Time.replace(',', ''),
          total: cents(parseFloat(e.Proceeds) * rate),
          type: 'sell'
        });
      } else if (q > 0) {
        ret.push({
          amount: q,
          currency: e.Currency,
          date: e.Date_Time.substr(0, 10),
          fee: cents(-parseFloat(e.Comm_Fee) * rate),
          id: this.makeId('BUY', e.Date_Time, e.Symbol),
          rate,
          target: this.symbol(e.Symbol),
          time: e.Date_Time.replace(',', ''),
          total: cents((-parseFloat(e.Proceeds) - parseFloat(e.Comm_Fee)) * rate),
          type: 'buy'
        });
      }
    }
    return ret;
  }

  matchDividend(str) {

    let re = /^([.A-Z ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([A-Z][A-Z][A-Z]) ([0-9.]+)/.exec(str);
    if (re) {
      return [this.symbol(re[1]), re[4]];
    }
    // Blah, sometimes they are other way around.
    re = /^([.A-Z ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([0-9.]+) ([A-Z][A-Z][A-Z])/.exec(str);
    if (re) {
      return [this.symbol(re[1]), re[3]];
    }
    // Per share missing in special cases.
    re = /^([.A-Z ]+?)\s*\([0-9A-Z]+\) (Payment in Lieu of Dividend - US Tax|Payment in Lieu of Dividend \(Ordinary Dividend\))/.exec(str);
    if (re) {
      return [this.symbol(re[1]), null];
    }
    // Stock dividend tax or cash portion.
    re = /^([.A-Z ]+?)\s*\([0-9A-Z]+\) (Stock Dividend) ([A-Z][A-Z][0-9]+) ([0-9]+ for [0-9]+) (- US TAX|\(Ordinary Dividend\))$/.exec(str);
    if (re) {
      return [this.symbol(re[1]), null];
    }

    throw new Error(`Cannot parse dividend '${str}'`);
  }

  async parseTax(data) {
    const taxes = {};
    for (const e of data.filter(e => e.Date && e.Currency && e.Amount)) {
      const [target] = this.matchDividend(e.Description);
      const rate = await Tx.fetchRate(e.Date, `CURRENCY:${e.Currency}`);
      const amount = cents(-parseFloat(e.Amount) * rate);
      taxes[this.makeId('TAX', e.Date, target)] = amount;
    }
    return taxes;
  }

  async parseDividends(data, taxes) {
    const ret = [];
    for (const e of data.filter(e => e.Date && e.Currency && e.Amount)) {
      const [target, perShare] = this.matchDividend(e.Description);
      const rate = await Tx.fetchRate(e.Date, `CURRENCY:${e.Currency}`);
      const id = this.makeId('DIV', e.Date, target);
      ret.push({
        amount: perShare === null ? 1 : Math.round(parseFloat(e.Amount) / parseFloat(perShare)),
        currency: e.Currency,
        date: e.Date,
        given: perShare === null ? cents(parseFloat(e.Amount) * rate) : parseFloat(perShare),
        id,
        rate,
        target,
        tax: taxes[id.replace('DIV', 'TAX')] || 0,
        total: cents(parseFloat(e.Amount) * rate),
        type: 'dividend'
      });
    }
    return ret;
  }

  async parseCorporateActions(data) {
    const ret = [];

    for (const e of data.filter(e => e.Report_Date)) {
      // console.log(e);
    }
    return ret;
  }
}

module.exports = new LynxImport();
