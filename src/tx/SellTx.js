const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const validator = require('../data/validator');

/**
 * An (negative) `amount` of tradeable commodity `target` is sold possibly with trading `fee`.
 * Optionally selling can happen in different `currency`. Also `profit` can be given
 * (negative if losses). Otherwise it is calculated from average price.
 */
module.exports = class SellTx extends Tx {

  constructor(data = {}) {
    super('sell', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined, profit: null }, data);
  }

  set profit(val) {
    validator.isNumOrNull('profit', val);
    this.data.profit = val;
  }
  get profit() {
    return this.get('profit');
  }

  getMyEntries() {
    const total = num.cents(this.total - this.fee);
    let ret = [
      {number: this.getAccount('currencies', this.currency), amount: total}
    ];
    if (this.fee) {
      ret.push({number: this.getAccount('fees'), amount: this.fee});
    }

    if (config.flags.noProfit) {
      // In case of not calculating profits yet, use the total price.
      ret.push({number: this.getAccount('targets', this.target), amount: num.cents(-this.total)});
    } else {
      // Otherwise calculate losses or profits from the losses or average price.
      let buyPrice;
      let diff;
      if (this.profit === null) {
        buyPrice = num.cents(-this.amount * this.avg);
        diff = num.cents(buyPrice - this.total);
      } else {
        diff = num.cents(-this.profit);
        buyPrice = num.cents(total + diff);
      }
      if (diff > 0) {
        // In losses, add to debit side into losses.
        ret.push({number: this.getAccount('losses'), amount: diff});
        ret.push({number: this.getAccount('targets', this.target), amount: -buyPrice});
      } else if (diff < 0) {
        // In profits, add to credit side into profits
        ret.push({number: this.getAccount('profits'), amount: diff});
        ret.push({number: this.getAccount('targets', this.target), amount: -buyPrice});
      } else {
        ret.push({number: this.getAccount('targets', this.target), amount: -this.total});
      }
    }
    return ret;
  }

  getMyText() {
    let opts = [];
    if (!config.flags.noProfit) {
      opts.push(text.option('average', this));
    }
    opts.push(text.option('stockNow', this));
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    this.avg = this.requireAverage(stock, this.getTarget());
    const {amount} = stock.add(this.amount, this.getTarget(), this.total - this.fee);
    this.stock = amount;
  }
};
