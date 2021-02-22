const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * An (negative) `amount` of tradeable commodity `target` is sold possibly with trading `fee`.
 * Optionally selling can happen in different `currency`.
 */
module.exports = class SellTx extends Tx {

  constructor(data = {}) {
    super('sell', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined, notes: null, burnAmount: null, burnTarget: null }, data);
    this.shortSell = false;
  }

  getMyEntries() {
    // Handle short selling.
    if (this.shortSell) {
      const ret = [
        { number: this.getAccount('currencies', this.currency), amount: num.cents(this.total - this.fee) },
        { number: this.getAccount('loans', this.target), amount: num.cents(-this.total) }
      ];
      if (this.fee) {
        ret.push({ number: this.getAccount('fees'), amount: this.fee });
      }
      return ret;
    }

    // Handle long selling.
    const ret = [
      { number: this.getAccount('currencies', this.currency), amount: num.cents(this.total - this.fee) }
    ];
    if (this.fee) {
      ret.push({ number: this.getAccount('fees'), amount: this.fee });
    }

    if (config.flags.noProfit) {
      // In case of not calculating profits yet, use the total price.
      ret.push({ number: this.getAccount('targets', this.target), amount: num.cents(-this.total) });
    } else {
      // Otherwise calculate losses or profits from the losses or average price.
      const buyPrice = num.cents(-this.amount * this.avg);
      const diff = num.cents(buyPrice - this.total);
      if (diff > 0) {
        // In losses, add to debit side into losses.
        ret.push({ number: this.getAccount('losses'), amount: diff });
        ret.push({ number: this.getAccount('targets', this.target), amount: num.cents(-buyPrice) });
      } else if (diff < 0) {
        // In profits, add to credit side into profits
        ret.push({ number: this.getAccount('profits'), amount: diff });
        ret.push({ number: this.getAccount('targets', this.target), amount: num.cents(-buyPrice) });
      } else {
        // TODO: Actually share this line with two above.
        ret.push({ number: this.getAccount('targets', this.target), amount: num.cents(-this.total) });
      }
    }
    return ret;
  }

  getMyText() {
    const opts = [];
    if (this.notes) {
      opts.push(text.option(this.notes, this));
    }
    if (!config.flags.noProfit) {
      opts.push(text.option('average', this));
    }
    opts.push(text.option('stockNow', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    const have = stock.getStock(this.getTarget());
    this.shortSell = (-this.amount > have);
    if (this.shortSell) {
      if (!config.flags.shortSell) {
        throw new Error(`Trying to sell ${-this.amount} ${this.getTarget()} when having only ${have}. Must turn short selling option on.`);
      }
      if (have) {
        throw new Error(`Mixed long and short not yet supported when selling ${-this.amount} ${this.getTarget()} and having ${have}.`);
      }
      this.notes = 'shortPosition';
    }

    if (this.burnAmount) {
      const burned = -this.burnAmount * this.requireAverage(stock, this.getBurnTarget());
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }

    if (this.shortSell) {
      this.avg = num.cents(this.total / (-this.amount));
      const { amount } = stock.add(this.amount, this.getTarget(), this.total - this.fee);
      this.stock = amount;
      stock.setAverages({ [this.getTarget()]: this.avg });
    } else {
      this.avg = this.requireAverage(stock, this.getTarget());
      const { amount } = stock.add(this.amount, this.getTarget(), this.total - this.fee);
      this.stock = amount;
    }
  }
};
