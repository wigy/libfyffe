const config = require('../config');
const Tx = require('./Tx');

/**
 * A tradeable commodity is sold.
 */
module.exports = class SellTx extends Tx {

  constructor(data = {}) {
    super('sell', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0 }, data);
  }
}
