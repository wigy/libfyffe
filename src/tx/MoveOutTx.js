const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Tradeable commodity is transferred out of the system.
 */
module.exports = class MoveOutTx extends Tx {

  constructor(data = {}) {
    super('move-out', { target: undefined, amount: undefined, stock: undefined, avg: undefined, fee: 0.0, burnAmount: null, burnTarget: null }, data);
  }

  getMyEntries() {
    // Note: this is only partial entry.
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(-this.total)},
      {number: this.getAccount('imbalance'), amount: num.cents(this.total)}
    ];
  }

  getMyText() {
    let opts = [];
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts.push(text.option('stockNow', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    if (this.burnAmount) {
      stock.add(this.burnAmount, this.burnTarget, this.total);
    }
    const {amount, avg} = stock.add(this.amount, this.target, this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
