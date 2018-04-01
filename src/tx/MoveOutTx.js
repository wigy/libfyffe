const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Tradeable commodity is transferred out of the system.
 */
module.exports = class MoveOutTx extends Tx {

  constructor(data = {}) {
    super('move-out', { target: undefined, amount: undefined, stock: undefined, avg: undefined, fee: 0.0 }, data);
  }

  getMyEntries() {
    // Note: this is only partial entry.
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(-this.total)},
      {number: this.getAccount('imbalance'), amount: num.cents(this.total)}
    ];
  }

  getMyText() {
    return text.withOptions(text.tx(this), [text.option('stockNow', this)]);
  }

  updateStock(stock) {
    const {amount, avg} = stock.add(this.amount, this.target, this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
