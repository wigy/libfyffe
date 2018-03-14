const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * A tradeable commodity is bought.
 */
module.exports = class BuyTx extends Tx {

  constructor(data = {}) {
    super('buy', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined }, data);
  }

  getEntries() {
    if (this.fee) {
      return [
        {number: this.getAccount('targets', this.target), amount: num.cents(this.total - this.fee)},
        {number: this.getAccount('fees'), amount: num.cents(this.fee)},
        {number: this.getAccount('currencies', config.currency), amount: num.cents(-this.total)}
      ];
    }
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', config.currency), amount: num.cents(-this.total)}
    ];
  }

  getText() {
    let opts = [text.option('stock', this)];
    if (!config.flags.noProfit) {
      opts.push(text.option('averageNow', this));
    }
    return text.withOptions(text.tx(this), opts);
  }
};
