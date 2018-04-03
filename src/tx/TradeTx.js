const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Tradeable commodity `given` x `source` is exchanged into the other tradable commodity `amount` x target`.
 */
module.exports = class TradeTx extends Tx {

  constructor(data = {}) {
    super('trade', { target: undefined, source: undefined, amount: undefined, given: undefined, stock: undefined, avg: undefined, fee: 0.0 }, data);
  }

  getMyEntries() {
    throw new Error('TODO');
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('imbalance'), amount: num.cents(-this.total)}
    ];
  }

  getMyText() {
    throw new Error('TODO');
    return text.withOptions(text.tx(this), [text.option('stock', this)]);
  }

  updateStock(stock) {
    throw new Error('TODO');
    const {amount, avg} = stock.add(this.amount, this.target, this.total);
    this.stock = amount;
    this.avg = avg;
  }
};
