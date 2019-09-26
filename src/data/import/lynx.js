const { SinglePassImport } = require('../import');

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
    const ret = {};
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
        ret[prefix] = await this.loadCSV(header + '\n' + body);
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
    delete ret['Statement'];
    delete ret['Account Information'];
    delete ret['Net Asset Value'];
    delete ret['Change in NAV'];
    delete ret['Mark-to-Market Performance Summary'];
    delete ret['Realized & Unrealized Performance Summary'];
    delete ret['Cash Report'];
    delete ret['Open Positions'];
    delete ret['Forex Balances'];
    delete ret['Change in Dividend Accruals'];
    delete ret['Financial Instrument Information'];
    delete ret['Codes'];
    delete ret['Notes/Legal Notes'];

    return this.parseDividends(ret['Dividends']);
  }

  parseDividends(data) {
    return data.filter(e => e.Date && e.Currency && e.Amount).map(e => {
      let re = /^([A-Z ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([A-Z][A-Z][A-Z]) ([0-9.]+)/.exec(e.Description);
      if (!re) {
        // Blah, sometimes they are other way around.
        re = /^([A-Z ]+?)\s*\([0-9A-Z]+\) (Cash Dividend) ([0-9.]+) ([A-Z][A-Z][A-Z])/.exec(e.Description);
        if (re) {
          const a = re[3];
          re[3] = re[4];
          re[4] = a;
        }
      }
      if (!re) {
        throw new Error(`Cannot parse dividend '${e.Description}'`);
      }
      const target = re[1].replace(/ PR([A-Z])/, '-$1');
      // TODO: Tax, currency rate.
      return {
        amount: Math.round(parseFloat(e.Amount) / parseFloat(re[4])),
        currency: e.Currency,
        date: e.Date,
        given: parseFloat(re[4]),
        id: this.makeId('DIV', e.Date, target),
        rate: 1.0,
        target,
        tax: 0,
        total: parseFloat(e.Amount), // TODO: Multiply by rate.
        type: 'dividend'
      };
    });
  }
}

module.exports = new LynxImport();
