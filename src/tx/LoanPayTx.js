const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Current loan paid back.
 */
module.exports = class LoanPayTx extends Tx {

  constructor(data = {}) {
    super('loan-pay', { currency: config.currency }, data);
  }

  getMyEntries() {
    return [
      { number: this.getAccount('loans', this.currency), amount: num.cents(this.total) },
      { number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total) }
    ];
  }

  getMyText() {
    return text.tx(this);
  }

  updateStock(stock) {
  }
};
