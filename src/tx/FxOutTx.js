const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const validator = require('../data/validator');

/**
 * The `target` currency is traded out and another `currency` is received in,
 * i.e. selling foreign currency.
 */
module.exports = class FxOutTx extends Tx {

  constructor(data = {}) {
    super('fx-out', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0 }, data);
  }

  set amount(val) {
    validator.isLtZero('amount', val);
    this.data.amount = val;
  }

  getMyEntries() {
    return [
      {number: this.getAccount('currencies', this.currency), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.target), amount: num.cents(-this.total)}
    ];
  }

  getMyText() {
    let opts = [text.option('outRate', this)];
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    stock.add(this.amount, this.getTarget(), this.total);
  }
};
