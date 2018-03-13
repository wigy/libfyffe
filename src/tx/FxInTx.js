const Tx = require('./Tx');

/**
 * The primary currency is traded to another currency.
 */
module.exports = class FxInTx extends Tx {

  constructor(data = {}) {
    super('fx-in', { target: undefined, amount: undefined, currency: undefined, rate: undefined, fee: 0.0 }, data);
  }
}
