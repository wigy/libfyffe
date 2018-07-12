const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const validator = require('../data/validator');

/**
 * An arbitraty income classified by `target` field.
 */
module.exports = class IncomeTx extends Tx {

  constructor(data = {}) {
    super('income', { target: undefined, amount: undefined, currency: config.currency }, data);
  }

  set amount(val) {
    validator.isGtZero('amount', val);
    this.data.amount = val;
  }

  getMyEntries() {
    return [
      {number: this.getAccount('incomes', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)}
    ];
  }

  getMyText() {
    let opts = [text.option('income.' + this.target.toLowerCase(), this)];
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
  }
};
