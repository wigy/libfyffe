const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const config = require('../config');

/**
 * Tradeable commodity is transferred in to the system.
 */
module.exports = class MoveInTx extends Tx {

  constructor(data = {}) {
    super('move-in', { target: undefined, amount: undefined, stock: undefined, avg: undefined, fee: 0.0, burnAmount: null, burnTarget: null }, data);
  }

  getMyEntries() {
    const ret = [
      { number: this.getAccount('targets', this.target), amount: num.cents(this.total - this.fee) },
      { number: this.getAccount('imbalance'), amount: num.cents(-this.total) }
    ];
    if (this.fee) {
      ret.push({ number: this.getAccount('fees'), amount: this.fee });
    }
    return ret;
  }

  getMyText() {
    const opts = [];
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts.push(text.option('stock', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    const addTotal = !this.total;
    if (addTotal) {
      this.total = num.cents(this.requireAverage(stock, this.getTarget()) * this.amount);
    }
    if (this.burnAmount) {
      const burned = -this.burnAmount * this.requireAverage(stock, this.getBurnTarget());
      if (addTotal) {
        this.total += burned;
      }
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }
    const { amount, avg } = stock.add(config.flags.zeroMoves ? 0 : this.amount, this.getTarget(), this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
