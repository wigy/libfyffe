const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * A dividend `amount` (num of shares) x `given` (dividend per share) from `target` is distributed to some `currency` account.
 *
 * Additionally amount of `tax` deducted and conversion `rate` for currency may be given.
 * If `amount` is zero, then the dividend is a lump sum.
 */
module.exports = class DividendTx extends Tx {

  constructor(data = {}, type = 'dividend') {
    super(type, { currency: config.currency, rate: undefined, tax: 0.0, target: undefined, amount: undefined, given: undefined, source: null }, data);
  }

  getMyEntries() {
    const ret = [
      { number: this.getAccount('dividends'), amount: num.cents(-this.total) }
    ];
    if (this.tax) {
      const tax = num.cents(this.tax);
      const acc = this.currency === config.currency ? this.getAccount('taxes', 'income') : this.getAccount('taxes', 'source');
      const amount = num.cents(this.total - tax);
      ret.push({ number: this.getAccount('currencies', this.currency), amount: amount });
      ret.push({ number: acc, amount: tax });
    } else {
      ret.push({ number: this.getAccount('currencies', this.currency), amount: num.cents(this.total) });
    }

    return ret;
  }

  getMyText() {
    const opts = [text.option('dividend', this)];
    if (this.currency !== config.currency) {
      opts.push(text.option('rate', this));
    }
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
  }
};
