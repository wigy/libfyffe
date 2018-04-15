const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * A tradeable commodity is bought.
 */
module.exports = class BuyTx extends Tx {

  constructor(data = {}) {
    super('buy', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0, stock: undefined, avg: undefined, burnAmount: null, burnTarget: null }, data);
  }

  getMyEntries() {
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

  getMyText() {
    let opts = [];
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
    if (this.burnAmount) {
      const burned = -this.burnAmount * stock.getAverage(this.getBurnTarget());
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }
    const {amount, avg} = stock.add(this.amount, this.getTarget(), this.total - this.fee);
    this.stock = amount;
    this.avg = avg;
  }
};
