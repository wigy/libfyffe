const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * A dividend is distributed to some currency account.
 */
module.exports = class DividendTx extends Tx {

  constructor(data = {}) {
    super('dividend', { currency: config.currency, rate: undefined, tax: 0.0, target: undefined, amount: undefined }, data);
  }

  getEntries() {
    let ret = [
      {number: this.getAccount('dividends'), amount: num.cents(-this.total)}
    ];
    if (this.tax) {
      const tax = num.cents(this.tax);
      const acc = this.currency === config.currency ? this.getAccount('taxes', 'income') : this.getAccount('taxes', 'source');
      const amount = num.cents(this.total - tax);
      ret.push({number: this.getAccount('currencies', this.currency), amount: amount});
      ret.push({number: acc, amount: tax});
    } else {
      ret.push({number: this.getAccount('currencies', this.currency), amount: num.cents(this.total)});
    }

    return ret;
  }

  getText() {
    let opts = [];
    if (this.currency !== config.currency) {
      opts.push(text.option('rate', this));
    }
    return text.withOptions(text.tx(this), opts);
  }
};
