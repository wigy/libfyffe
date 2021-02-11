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
  }

  getMyEntries() {
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
        ret.push({ number: this.getAccount('targets', this.target), amount: -buyPrice });
      } else if (diff < 0) {
        // In profits, add to credit side into profits
        ret.push({ number: this.getAccount('profits'), amount: diff });
        ret.push({ number: this.getAccount('targets', this.target), amount: -buyPrice });
      } else {
        ret.push({ number: this.getAccount('targets', this.target), amount: -this.total });
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
    if (this.burnAmount) {
      const burned = -this.burnAmount * this.requireAverage(stock, this.getBurnTarget());
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }
    this.avg = this.requireAverage(stock, this.getTarget());
    const { amount } = stock.add(this.amount, this.getTarget(), this.total - this.fee);
    this.stock = amount;
  }
};
