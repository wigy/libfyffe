const Tx = require('./Tx');

/**
 * Tradeable commodity is transferred in to the system.
 */
module.exports = class MoveInTx extends Tx {

  constructor(data = {}) {
    super('move-in', { target: undefined, amount: undefined} , data);
  }
}
