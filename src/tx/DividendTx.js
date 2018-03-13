const config = require('../config');
const Tx = require('./Tx');

/**
 * A dividend is distributed to some currency account.
 */
module.exports = class DividendTx extends Tx {

  constructor(data = {}) {
    super('dividend', { currency: config.currency, rate: undefined, tax: 0.0 }, data);
  }
}
