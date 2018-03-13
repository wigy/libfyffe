const config = require('../config');
const Tx = require('./Tx');

/**
 * A tradeable commodity is bought.
 */
module.exports = class BuyTx extends Tx {

  constructor(data = {}) {
    super('buy', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined }, data);
  }
}
