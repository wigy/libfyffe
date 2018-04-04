const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Tradeable commodity is transferred in to the system.
 */
module.exports = class MoveInTx extends Tx {

  constructor(data = {}) {
    super('move-in', { target: undefined, amount: undefined, stock: undefined, avg: undefined, fee: 0.0, burnAmount: null, burnTarget: null }, data);
  }

  getMyEntries() {
    let ret = [
      {number: this.getAccount('targets', this.target), amount: num.cents(this.total - this.fee)},
      {number: this.getAccount('imbalance'), amount: num.cents(-this.total)}
    ];
    if (this.fee) {
      ret.push({number: this.getAccount('fees'), amount: this.fee});
    }
    return ret;
  }

  getMyText() {
    let opts = [];
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts.push(text.option('stock', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    if (!this.total) {
      this.total = num.cents(stock.getAverage(this.target) * this.amount);
    }
    if (this.burnAmount) {
      const burned = -this.burnAmount * stock.getAverage(this.burnTarget);
      stock.add(this.burnAmount, this.burnTarget, burned);
      this.fee = num.cents(this.fee + burned);
    }
    const {amount, avg} = stock.add(this.amount, this.target, this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
