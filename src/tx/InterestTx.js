const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');

/**
 * An interest is paid for loan.
 */
module.exports = class InterestTx extends Tx {

  constructor(data = {}) {
    super('interest', { currency: config.currency, rate: undefined }, data);
  }

  getEntries() {
    return [
      {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)},
      {number: this.getAccount('interest'), amount: num.cents(this.total)},
    ];
  }
}
