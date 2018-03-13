const Tx = require('./Tx');

/**
 * Tradeable commodity is transferred out of the system.
 */
module.exports = class MoveOutTx extends Tx {

  constructor(data = {}) {
    super('move-out', { target: undefined, amount: undefined}, data);
  }
}
