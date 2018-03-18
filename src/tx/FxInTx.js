const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * The `target` currency is traded in and another `currency` is given out.
 */
module.exports = class FxInTx extends Tx {

  constructor(data = {}) {
    super('fx-in', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0 }, data);
  }

  // TODO: Add check that amount is positive.

  getEntries() {
    return [
      {number: this.getAccount('currencies', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)}
    ];
  }

  getText() {
    let opts = [text.option('inRate', this)];
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    stock.add(this.amount, this.target, this.total);
  }
};
