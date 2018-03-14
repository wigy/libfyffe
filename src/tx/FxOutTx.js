const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * The `target` currency is traded out and another `currency` is received in.
 */
module.exports = class FxOutTx extends Tx {

  constructor(data = {}) {
    super('fx-out', { target: config.currency, amount: undefined, currency: undefined, rate: undefined, fee: 0.0 }, data);
  }

  getEntries() {
    return [
      {number: this.getAccount('currencies', this.currency), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', this.target), amount: num.cents(-this.total)}
    ];
  }

  getText() {
    let opts = [text.option('outRate', this)];
    return text.withOptions(text.tx(this), opts);
  }
};
