const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Failed import entry.
 */
module.exports = class ErrorTx extends Tx {

  constructor(data = {}) {
    super('error', { target: null, notes: '' }, data);
  }

  getMyEntries() {
    if (this.notes === 'in') {
      return [
        {number: this.target, amount: num.cents(this.total)},
        {number: this.getAccount('imbalance'), amount: num.cents(-this.total)}
      ];
    }
    if (this.notes === 'out') {
      return [
        {number: this.target, amount: num.cents(-this.total)},
        {number: this.getAccount('imbalance'), amount: num.cents(this.total)}
      ];
    }
    return [];
  }

  getMyText() {
    return text.tx(this);
  }

  updateStock(stock) {
  }
};
