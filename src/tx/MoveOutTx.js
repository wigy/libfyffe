const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');

/**
 * Tradeable commodity is transferred out of the system.
 */
module.exports = class MoveOutTx extends Tx {

  constructor(data = {}) {
    super('move-out', { target: undefined, amount: undefined, stock: undefined, avg: undefined }, data);
  }

  getEntries() {
    // Note: this is only partial entry.
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(-this.total)},
    ];
  }
}
