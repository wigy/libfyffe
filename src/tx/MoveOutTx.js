const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const config = require('../config');

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
    let opts = [text.option('average', this)];
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts.push(text.option('stockNow', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    const addTotal = !this.total;
    if (addTotal) {
      this.total = num.cents(-stock.getAverage(this.getTarget()) * this.amount);
    }
    if (this.burnAmount) {
      const burned = -this.burnAmount * stock.getAverage(this.getBurnTarget());
      if (addTotal) {
        this.total += burned;
      }
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }
    const {amount, avg} = stock.add(config.flags.zeroMoves ? 0 : this.amount, this.getTarget(), this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
