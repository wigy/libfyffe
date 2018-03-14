const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * The `target` currency is traded in and another `currency` is given out.
 */
module.exports = class FxInTx extends Tx {

  constructor(data = {}) {
    super('fx-in', { target: undefined, amount: undefined, currency: config.currency, rate: undefined, fee: 0.0 }, data);
  }

  getEntries() {
    return [
      {number: this.getAccount('currencies', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.currency), amount: num.cents(-this.total)},
    ];
  }

  getText() {
    let opts = [text.option('inRate', this)];
    return text.withOptions(text.tx(this), opts);
  }
}
