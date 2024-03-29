const dump = require('neat-dump');
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
    let appendix = '';
    // Drop 0xfeff from the string pos 0.
    for (const line of file.substr(1).split('\n')) {
      const same = prefix && line.substr(0, prefix.length) === prefix;
      if (header && same) {
        body += line + '\n';
        continue;
      }
      if (header && !same) {
        data[prefix + appendix] = await this.loadCSV(header + '\n' + body);
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
        // Hmm, what is this section?
        if (prefix === 'Dividends' && line.endsWith(',Code')) {
          appendix = '2';
        } else {
          appendix = '';
        }
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

    const interest = data.Interest ? await this.parseInterest(data.Interest) : [];
    const forex = data.Trades ? await this.parseForex(data.Trades) : [];
    const deposits = data['Deposits & Withdrawals'] ? await this.parseFunding(data['Deposits & Withdrawals']) : [];
    const taxes = data['Withholding Tax'] ? await this.parseTax(data['Withholding Tax']) : [];
    const dividends = data.Dividends ? await this.parseDividends(data.Dividends, taxes) : [];
    const actions = data['Corporate Actions'] ? await this.parseCorporateActions(data['Corporate Actions']) : [];
    const trades = data.Trades ? await this.parseTrades(data.Trades) : [];
    const fees = data.Fees ? await this.parseFees(data.Fees) : [];

    return interest.concat(forex).concat(deposits).concat(dividends).concat(actions).concat(trades).concat(fees);
  }

  async parseFees(data) {
    const ret = [];
    for (const e of data.filter(e => e.Date && e.Amount && e.Header === 'Data')) {

      const rate = await Tx.fetchRate(e.Date, `CURRENCY:${e.Currency}`);
      if (!rate) {
        throw new Error(`Failed to fetch currency rate ${e.Currency} on ${e.Date}.`);
      }

      ret.push({
        currency: e.Currency,
        date: e.Date,
        id: this.makeId('INTEREST', e.Date),
        rate,
        time: e.Date,
        total: cents(-parseFloat(e.Amount) * rate),
        type: 'expense',
        target: 'OTHER',
        notes: e.Description.toLowerCase()
      });
    }

    return ret;
  }

  async parseInterest(data) {
    const ret = [];
    for (const e of data.filter(e => e.Date && e.Amount && e.Header === 'Data')) {
      const rate = await Tx.fetchRate(e.Date, `CURRENCY:${e.Currency}`);
      if (!rate) {
        throw new Error(`Failed to fetch currency rate ${e.Currency} on ${e.Date}.`);
      }
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

    let re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([A-Z][A-Z][A-Z]) ([0-9.]+) ((per Share )?(- [A-Z][A-Z] Tax)?)((- Reversal )?\((Ordinary|Bonus) Dividend\))?(\(Interest\))?$/.exec(str);
    if (re) {
      return [this.symbol(re[1]), re[4]];
    }
    // Blah, sometimes they are other way around.
    re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([0-9.]+) ([A-Z][A-Z][A-Z]) ((per Share )?- [A-Z][A-Z] Tax)$/.exec(str);
    if (re) {
      return [this.symbol(re[1]), re[3]];
    }
    // And more special cases.
    re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([A-Z][A-Z][A-Z]) ([0-9.]+) (per Share|Payment in Lieu of Dividend)? \((Ordinary Dividend|Limited Partnership|Return of Capital)\)$/i.exec(str);
    if (re) {
      return [this.symbol(re[1]), re[4]];
    }
    // Per share missing in special cases.
    re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) (Payment in Lieu of Dividend - US Tax|Payment in Lieu of Dividend \((Ordinary Dividend|Limited Partnership)\))$/i.exec(str);
    if (re) {
      return [this.symbol(re[1]), null];
    }
    // Stock dividend tax or cash portion.
    re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) (Stock Dividend) ([A-Z0-9]+) ([0-9]+ for [0-9]+) (- US TAX|\(Ordinary Dividend\))$/.exec(str);
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
    const count = {};
    for (const e of data.filter(e => e.Date && e.Currency && e.Amount)) {
      const [target, perShare] = this.matchDividend(e.Description);
      const rate = await Tx.fetchRate(e.Date, `CURRENCY:${e.Currency}`);
      count[`${e.Date}${target}`] = (count[`${e.Date}${target}`] || 0) + 1;
      let id;
      if (count[`${e.Date}${target}`] > 1) {
        id = this.makeId('DIV', e.Date, target, count[`${e.Date}${target}`]);
      } else {
        id = this.makeId('DIV', e.Date, target);
      }
      const total = cents(parseFloat(e.Amount) * rate);
      if (total < 0) {
        let i;
        for (i = ret.length - 1; i >= 0; i--) {
          if (ret[i].target === target && cents(ret[i].total + total) === 0) {
            ret.splice(i, 1);
            break;
          }
        }
        if (i < 0) {
          throw new Error(`Cannot find matching negative dividend ${total} for ${target}.`);
        }
        continue;
      }
      ret.push({
        amount: perShare === null ? 1 : Math.round(parseFloat(e.Amount) / parseFloat(perShare)),
        currency: e.Currency,
        date: e.Date,
        given: perShare === null ? cents(parseFloat(e.Amount) * rate) : parseFloat(perShare),
        id,
        rate,
        target,
        tax: taxes[id.replace('DIV', 'TAX')] || 0,
        total,
        type: 'dividend'
      });
    }
    return ret;
  }

  async parseCorporateActions(data) {

    const acquisitions = {};

    const match = async (e) => {
      const date = e.Report_Date;
      const rate = await Tx.fetchRate(date, `CURRENCY:${e.Currency}`);

      let re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Merged\(Liquidation\)/.exec(e.Description);
      if (re) {
        const target = this.symbol(re[1]);
        return [{
          amount: parseFloat(e.Quantity),
          currency: e.Currency,
          date,
          fee: 0.00,
          id: this.makeId('MERGE', date, target),
          rate,
          target,
          total: cents(parseFloat(e.Proceeds) * rate),
          notes: 'forceSell',
          type: 'sell'
        }];
      }

      re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Merged\(Acquisition\).*\(([.A-Z0-9 ]+?),.*\)/.exec(e.Description);
      if (re) {
        const what = this.symbol(re[1]);
        const sym = this.symbol(re[2]);
        const q = this.num(e.Quantity);
        if (!acquisitions[what]) {
          acquisitions[what] = {};
        }
        if (q < 0) {
          acquisitions[what].source = sym;
          acquisitions[what].given = q;
        } else {
          acquisitions[what].target = sym;
          acquisitions[what].amount = q;
        }
        if (Object.keys(acquisitions[what]).length >= 4) {
          const { source, given, target, amount } = acquisitions[what];
          delete acquisitions[what];
          return [{
            amount,
            given,
            currency: e.Currency,
            date,
            fee: 0.0,
            id: this.makeId('CALL', date, `${source}-${target}`),
            notes: 'call',
            source,
            target,
            total: Math.abs(this.num(e.Value)),
            type: 'trade'
          }];
        } else {
          return [];
        }
      }

      re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Merged\(Partial Call\)/.exec(e.Description);
      if (re) {
        const target = this.symbol(re[1]);
        return [{
          amount: parseFloat(e.Quantity),
          currency: e.Currency,
          date,
          fee: 0.0,
          id: this.makeId('CALL', date, target),
          notes: 'call',
          rate,
          target,
          total: cents(-parseFloat(e.Value) * rate),
          type: 'sell'
        }];
      }

      re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Stock Dividend/.exec(e.Description);
      if (re) {
        const target = this.symbol(re[1]);
        return [{
          amount: parseFloat(e.Quantity),
          source: this.symbol(re[1]),
          currency: e.Currency,
          date,
          given: 0,
          id: this.makeId('STOCKDIV', date, target),
          rate,
          target,
          tax: 0.00,
          total: cents(parseFloat(e.Value) * rate),
          type: 'stock-dividend'
        }];
      }

      re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Tendered to ([A-Z0-9]+) 1 FOR 1 \(([A-Z0-9]+)/.exec(e.Description);
      if (re) {
        const source = this.symbol(re[1]);
        const target = this.symbol(re[3]);
        const amount = parseFloat(e.Quantity);
        // Drop reverse entry of the same tender.
        if (amount < 0) {
          return [];
        }
        return [{
          amount,
          currency: e.Currency,
          date,
          fee: 0.0,
          given: -amount,
          id: this.makeId('TRADE', date, `${source}-${target}`),
          notes: 'tender',
          source,
          target,
          total: 0.00,
          type: 'trade'
        }];
      }

      re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Split ([0-9]+) for ([0-9]+) \(.+/.exec(e.Description);
      if (re) {
        dump.red(`Splits ${re[1]} ${re[2]} -> ${re[3]} not yet handled.`);
        return [];
      }

      re = /^([.A-Z0-9 ]+?)\s*\([0-9A-Z]+\) Spinoff +([0-9]+) for ([0-9]+) \((\S+)\s*,/.exec(e.Description);
      if (re) {
        const source = this.symbol(re[1]);
        const target = this.symbol(re[4]);
        const amount = parseFloat(e.Quantity);
        const ratio = parseInt(re[2]) / parseInt(re[3]);
        console.log(source, target, ratio, amount);
        return [{
          given: 0,
          source: this.symbol(re[1]),
          amount: parseFloat(e.Quantity),
          target,
          currency: e.Currency,
          date,
          id: this.makeId('SPINOFF', date, `${source}-${target}`),
          tax: 0.00,
          total: 0.00,
          fee: 0.00,
          notes: 'spinoff',
          type: 'trade'
        }];
      }

      throw new Error(`Cannot recognize corporate action '${e.Description}'.`);
    };

    let ret = [];
    for (const e of data.filter(e => e.Report_Date)) {
      ret = ret.concat(await match(e));
    }

    return ret;
  }

  vat(group, obj) {
    return null;
  }
}

module.exports = new LynxImport();
