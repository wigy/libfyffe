const config = require('../config');
const Tx = require('./Tx');

/**
 * An interest is paid for loan.
 */
module.exports = class InterestTx extends Tx {

  constructor(data = {}) {
    super('interest', { currency: config.currency, rate: undefined }, data);
  }
}
