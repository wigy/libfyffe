const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * A tradeable commodity is bought.
 */
module.exports = class BuyTx extends Tx {

  constructor(data = {}) {
    super('buy', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined, burnAmount: null, burnTarget: null, notes: null }, data);
    this.shortSell = false;
  }

  getMyEntries() {
    // Handle closing short position.
    if (this.shortSell) {
      const total = -this.stock2 * this.avg2;
      const total2 = this.total - this.fee;
      const fee = this.fee; // TODO: Just guessing here original fee - we cannot know for sure at this point.
      const fee2 = this.fee;
      const ret = [
        { number: this.getAccount('currencies', this.currency), amount: num.cents(-(fee + total2 + fee + fee2)) },
        { number: this.getAccount('loans', this.target), amount: num.cents(total) }
      ];
      if (this.fee) {
        ret.push({ number: this.getAccount('fees'), amount: this.fee });
      }
      const diff = num.cents(total2 - total + fee + fee2);
      if (diff < 0) {
        ret.push({ number: this.getAccount('profits'), amount: num.cents(diff) });
      } else if (diff > 0) {
        ret.push({ number: this.getAccount('losses'), amount: num.cents(diff) });
      }
      return ret;
    }

    // Handle normal buy.
    if (this.fee) {
      return [
        { number: this.getAccount('targets', this.target), amount: num.cents(this.total - this.fee) },
        { number: this.getAccount('fees'), amount: num.cents(this.fee) },
        { number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total) }
      ];
    }
    return [
      { number: this.getAccount('targets', this.target), amount: num.cents(this.total) },
      { number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total) }
    ];
  }

  getMyText() {
    const opts = [];
    if (this.notes) {
      opts.push(text.option(this.notes, this));
    }
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts.push(text.option('stock', this));
    if (!config.flags.noProfit) {
      opts.push(text.option('averageNow', this));
    }
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    const have = stock.getStock(this.getTarget());
    this.shortSell = (have < 0);
    if (this.shortSell) {
      if (!config.flags.shortSell) {
        throw new Error(`Trying to buy ${this.amount} ${this.getTarget()} when having ${have}. Must turn short selling option on.`);
      }
      if (this.amount > -have) {
        throw new Error(`Mixed long and short not yet supported when buying ${this.amount} ${this.getTarget()} and having ${have}.`);
      }
      this.notes = 'shortPosition';
    }

    if (this.burnAmount) {
      const burned = -this.burnAmount * this.requireAverage(stock, this.getBurnTarget());
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }

    if (this.shortSell) {
      this.stock2 = stock.getStock(this.getTarget());
      this.avg2 = stock.getAverage(this.getTarget());
    }
    const { amount, avg } = stock.add(this.amount, this.getTarget(), this.total - this.fee);
    this.stock = amount;
    this.avg = avg;
  }
};
