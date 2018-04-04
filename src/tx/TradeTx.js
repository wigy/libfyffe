const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const validator = require('../data/validator');

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

  /**
   * A tradeable commodity source used in the transaction.
   */
  set source(val) {
    validator.isRegexMatch('source', val, /^[-A-Z0-9]+\**?$/);
    this.data.source = val;
  }
  get source() {
    return this.get('source');
  }

  /**
   * The total amount of commodity given out in this transaction (if not currency).
   *
   * Negative for giving out and positive when receiving.
   */
  set given(val) {
    validator.isLtZero('given', val);
    this.data.given = val;
  }
  get given() {
    return this.get('given');
  }

  /**
   * The average price of the second commodity after this transaction.
   */
  set avg2(val) {
    validator.isGeZero('avg2', val);
    this.data.avg2 = val;
  }
  get avg2() {
    return this.get('avg2');
  }

  /**
   * The total amount of the second commodity owned after this transaction.
   */
  set stock2(val) {
    validator.isNum('stock2', val);
    this.data.stock2 = val;
  }
  get stock2() {
    return this.get('stock2');
  }

  /**
   * A tradeable commodity used to pay the transaction.
   */
  set burnTarget(val) {
    validator.isRegexMatch('burnTarget', val, /^[-A-Z0-9]+\**?$/);
    this.data.burnTarget = val;
  }
  get burnTarget() {
    return this.get('burnTarget');
  }

  /**
   * The total amount of commodity needed to pay this transaction.
   */
  set burnAmount(val) {
    validator.isGeZero('burnAmount', val);
    this.data.burnAmount = val;
  }
  get burnAmount() {
    return this.get('burnAmount');
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
    opts = opts.concat([text.option('stock', this), text.option('stockLeft', this)]);
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    // TODO: Calculate price. Make it optional in general?
    // TODO: Burned fee
    let dst = stock.add(this.amount, this.target, this.total);
    this.stock = dst.amount;
    this.avg = dst.avg;
    let src = stock.add(this.given, this.source, this.total);
    this.stock2 = src.amount;
    this.avg2 = src.avg;
  }
};
