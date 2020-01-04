const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const validator = require('../data/validator');

/**
 * An arbitrary expense classified by `target` field.
 */
module.exports = class ExpenseTx extends Tx {

  constructor(data = {}) {
    super('expense', { target: undefined, amount: undefined, currency: config.currency, rate: null, vat: null, notes: '' }, data);
  }

  set amount(val) {
    validator.isGtZero('amount', val);
    this.data.amount = val;
  }

  getMyEntries() {
    if (this.vat) {
      return [
        {number: this.getAccount('expenses', this.target), amount: num.cents(this.total - this.vat)},
        {number: this.getAccount('taxes', 'vat'), amount: num.cents(this.vat)},
        {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)}
      ];
    }
    return [
      {number: this.getAccount('expenses', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)}
    ];
  }

  getMyText() {
    const key = 'expense.' + this.target.toLowerCase();
    let opts = [text.option('notes', this)];
    return text.withOptions(text.tx(this, key), opts);
  }

  updateStock(stock) {
  }
};
