const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');

/**
 * The `target` currency is traded out and another `currency` is received in.
 */
module.exports = class FxOutTx extends Tx {

  constructor(data = {}) {
    super('fx-out', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0 }, data);
  }

  getEntries() {
    return [
      {number: this.getAccount('currencies', this.currency), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.target), amount: num.cents(-this.total)},
    ];
  }
}
