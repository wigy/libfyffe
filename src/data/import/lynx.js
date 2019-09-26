const Tx = require('../../tx/Tx');
const { SinglePassImport } = require('../import');
const { cents } = require('../../util/num');

class LynxImport extends SinglePassImport {

  constructor() {
    super('Lynx');
    this.ids = new Set();
  }

  isMine(content) {
    return /^\sStatement,Header,Field Name,Field Value/.test(content);
  }

  async load(file) {
    this.ids = new Set();
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
    delete data['Statement'];
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
    delete data['Codes'];
    delete data['Notes/Legal Notes'];

    const taxes = await this.parseTax(data['Withholding Tax']);
    return this.parseDividends(data['Dividends'], taxes);
  }

  matchDividend(str) {
    let re = /^([A-Z ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([A-Z][A-Z][A-Z]) ([0-9.]+)/.exec(str);
    if (!re) {
      // Blah, sometimes they are other way around.
      re = /^([A-Z ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([0-9.]+) ([A-Z][A-Z][A-Z])/.exec(str);
      if (re) {
        const a = re[3];
        re[3] = re[4];
        re[4] = a;
      }
    }
    if (!re) {
      throw new Error(`Cannot parse dividend '${str}'`);
    }
    re[1] = re[1].replace(/ PR([A-Z])/, '-$1');
    return re;
  }

  async parseTax(data) {
    const taxes = {};
    for (const e of data.filter(e => e.Date && e.Currency && e.Amount)) {
      const [ , target ] = this.matchDividend(e.Description);
      const rate = await Tx.getRate(e.Date, `CURRENCY:${e.Currency}`);
      const amount = cents(-parseFloat(e.Amount) * rate);
      taxes[this.makeId('TAX', e.Date, target)] = amount;
    }
    return taxes;
  }

  async parseDividends(data, taxes) {
    const ret = [];
    for (const e of data.filter(e => e.Date && e.Currency && e.Amount)) {
      const [ , target, , , count ] = this.matchDividend(e.Description);
      const rate = await Tx.getRate(e.Date, `CURRENCY:${e.Currency}`);
      const id = this.makeId('DIV', e.Date, target);

      ret.push({
        amount: Math.round(parseFloat(e.Amount) / parseFloat(count)),
        currency: e.Currency,
        date: e.Date,
        given: parseFloat(count),
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
}

module.exports = new LynxImport();
