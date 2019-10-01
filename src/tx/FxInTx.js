const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const validator = require('../data/validator');

/**
 * The `target` currency is traded in and another `currency` is given out,
 * i.e. buying foreign currency.
 */
module.exports = class FxInTx extends Tx {

  constructor(data = {}) {
    super('fx-in', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0 }, data);
  }

  set amount(val) {
    validator.isGtZero('amount', val);
    this.data.amount = val;
  }

  getMyEntries() {
    if (this.fee) {
      return [
        {number: this.getAccount('currencies', this.target), amount: num.cents(this.total - this.fee)},
        {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)},
        {number: this.getAccount('fees'), amount: num.cents(this.fee)}
      ];
    }
    return [
      {number: this.getAccount('currencies', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)}
    ];
  }

  getMyText() {
    let opts = [text.option('inRate', this)];
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    stock.add(this.amount, this.getTarget(), this.total);
  }
};
