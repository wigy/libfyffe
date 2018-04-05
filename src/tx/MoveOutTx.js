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
    let ret = [
      {number: this.getAccount('targets', this.target), amount: num.cents(-this.total)},
      {number: this.getAccount('imbalance'), amount: num.cents(this.total - this.fee)}
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
    opts.push(text.option('stockNow', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    const addTotal = !this.total;
    if (addTotal) {
      this.total = num.cents(-stock.getAverage(this.target) * this.amount);
    }
    if (this.burnAmount) {
      const burned = -this.burnAmount * stock.getAverage(this.burnTarget);
      if (addTotal) {
        this.total += burned;
      }
      stock.add(this.burnAmount, this.burnTarget, burned);
      this.fee = num.cents(this.fee + burned);
    }
    const {amount, avg} = stock.add(this.amount, this.target, this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
