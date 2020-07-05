const config = require('../config');
const DividendTx = require('./DividendTx');
const text = require('../text/make');

/**
 * A special dividend is provided as a number of other commodities than cash. The dividend for `target` is provided as
 * `amount` (num of commodities) x `source` (commodity given) and it is is distributed to some `currency` account.
 *
 * Additionally amount of `tax` deducted and conversion `rate` for currency may be given.
 */
module.exports = class StockDividendTx extends DividendTx {

  constructor(data = {}) {
    super(data, 'stock-dividend');
  }

  getMyText() {
    const opts = [text.option('stockDividend', this)];
    opts.push(text.option('averageNow', this));
    if (this.currency !== config.currency) {
      opts.push(text.option('rate', this));
    }
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    this.avg = this.requireAverage(stock, this.getSource());
    const { amount } = stock.add(this.amount, this.getSource(), 0.00);
    this.avg = this.requireAverage(stock, this.getSource());
    this.stock = amount;
  }
};
