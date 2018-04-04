const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Tradeable commodity `given` x `source` is exchanged into the other tradable commodity `amount` x target`.
 * Optionally the trade is paid with burning some `burnAmount` of the commodity `burnTarget`.
 */
module.exports = class TradeTx extends Tx {

  constructor(data = {}) {
    super('trade', { target: undefined,
      source: undefined,
      amount: undefined,
      given: undefined,
      stock: undefined,
      avg: undefined,
      stock2: undefined,
      avg2: undefined,
      fee: 0.0,
      burnTarget: undefined,
      burnAmount: undefined
    }, data);
  }

  getMyEntries() {
    // TODO: Fee handling (when fee in commodity).
    return [
      {number: this.getAccount('targets', this.target), amount: num.cents(this.total)},
      {number: this.getAccount('targets', this.source), amount: num.cents(-this.total)}
    ];
  }

  getMyText() {
    let opts = [];
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts = opts.concat([text.option('stock', this), text.option('stockLeft', this)]);
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    // TODO: Calculate price. Make it optional in general?
    if (this.burnAmount) {
      stock.add(this.burnAmount, this.burnTarget, this.total);
    }
    let dst = stock.add(this.amount, this.target, this.total);
    this.stock = dst.amount;
    this.avg = dst.avg;
    let src = stock.add(this.given, this.source, this.total);
    this.stock2 = src.amount;
    this.avg2 = src.avg;
  }
};
