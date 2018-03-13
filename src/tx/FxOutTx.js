const Tx = require('./Tx');

/**
 * Another currency is traded to the primary currency.
 */
module.exports = class FxOutTx extends Tx {

  constructor(data = {}) {
    super('fx-out', { target: undefined, amount: undefined, currency: undefined, rate: undefined, fee: 0.0 }, data);
  }
}
