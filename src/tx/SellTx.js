const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * A tradeable commodity is sold.
 */
module.exports = class SellTx extends Tx {

  constructor(data = {}) {
    super('sell', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined }, data);
  }

  getEntries() {
    const total = num.cents(this.total - this.fee);
    let ret = [
      {number: this.getAccount('currencies', config.currency), amount: total}
    ];
    if (this.fee) {
      ret.push({number: this.getAccount('fees'), amount: this.fee});
    }

    if (config.flags.noProfit) {
      // In case of not calculating profits yet, put in only buy price.
      ret.push({number: this.getAccount('targets', this.target), amount: num.cents(-total)});
    } else {
      // Otherwise calculate losses or profits from the average price.
      const buyPrice = num.cents(-this.amount * this.avg);
      const diff = num.cents(buyPrice - total);
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

  getText() {
    let opts = [];
    if (!config.flags.noProfit) {
      opts.push(text.option('average', this));
    }
    opts.push(text.option('stockNow', this));
    return text.withOptions(text.tx(this), opts);
  }
};
