const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * Tradeable commodity is transferred in to the system.
 */
module.exports = class MoveInTx extends Tx {

  constructor(data = {}) {
    super('move-in', { target: undefined, amount: undefined, stock: undefined, avg: undefined} , data);
  }

  getEntries() {
    // Note: this is only partial entry.
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(this.total)},
    ];
  }

  getText() {
    return text.withOptions(text.tx(this), [text.option('stock', this)]);
  }
}
