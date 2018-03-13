const config = require('../config');
const validator = require('../data/validator');
var cc = require('currency-codes');

/**
 * A map from valid type names to the module paths implementing them.
 */
const types = {
  deposit: './DepositTx',
  withdrawal: './WithdrawalTx',
  sell: './SellTx',
  buy: './BuyTx',
  dividend: './DividendTx',
  'fx-in': './FxInTx',
  'fx-out': './FxOutTx',
  interest: './InterestTx',
  'move-in': './MoveInTx',
  'move-out': './MoveOutTx',
}

/**
 * Abstract base class for different transactions.
 */
class Tx {

  /**
   * Construct a transaction.
   * @param {String} type Lower-case name of the transaction type.
   * @param {Object} add Additional fields activated by their initial values.
   * @param {Object} data Actual data content to initialize.
   */
  constructor(type, add = {}, data = {}) {
    // Check the input.
    if (!types[type]) {
      throw new Error('Invalid TX type in constructor: ' + JSON.stringify(type))
    }
    if (typeof(data) !== 'object' || data === null) {
      throw new Error('Invalid initial data in constructor: ' + JSON.stringify(data))
    }
    this.type = type;
    // Initialize defaults.
    this.data = Object.assign({
      total: undefined,
    }, add);
    // Verify keys in data.
    Object.keys(data).forEach((key) => {
      if (!(key in this.data)) {
        throw new Error('Invalid key ' + JSON.stringify(key) + ' for transaction in ' + JSON.stringify(data));
      }
    });
    // Implicitly validate each field.
    Object.assign(this, data);
  }

  /**
   * Total is sum of all entry values on the debit side.
   */
  set total(val) {
    validator.isGeZero('total', val);
    this.data.total = val;
  }
  get total() {
    return this.get('total');
  }

  /**
   * Currency is the currency used in the transaction.
   */
  set currency(val) {
    validator.isString('currency', val);
    validator.check('currency', val, (val) => cc.code(val));
    this.data.currency = val;
  }
  get currency() {
    return this.get('currency');
  }

  /**
   * Currency conversion rate at the time of the transaction.
   */
  set rate(val) {
    validator.isGtZero('rate', val);
    this.data.rate = val;
  }
  get rate() {
    return this.get('rate');
  }

  /**
   * A tradeable commodity used in the transaction.
   */
  set target(val) {
    validator.isRegexMatch('target', val, /^[-A-Z0-9]+\**?$/);
    this.data.target = val;
  }
  get target() {
    return this.get('target');
  }

  /**
   * Service fee charged for the transaction.
   */
  set fee(val) {
    validator.isGeZero('fee', val);
    this.data.fee = val;
  }
  get fee() {
    return this.get('fee');
  }

  /**
   * Tax deducted from the income.
   */
  set tax(val) {
    validator.isGeZero('tax', val);
    this.data.tax = val;
  }
  get tax() {
    return this.get('tax');
  }

  /**
   * The average price of the commodity after this transaction.
   */
  set avg(val) {
    validator.isGeZero('avg', val);
    this.data.avg = val;
  }
  get avg() {
    return this.get('avg');
  }

  /**
   * The total amount of commodity owned after this transaction.
   */
  set stock(val) {
    validator.isNum('stock', val);
    this.data.stock = val;
  }
  get stock() {
    return this.get('stock');
  }


  /**
   * Verify that the given field is set and get its value.
   * @param {String} name
   * @return {any} Value of the field if set.
   */
  get(name) {
    if (this.data[name] === undefined) {
      throw new Error('Value ' + name + ' for tx ' + JSON.stringify(this.data) + ' not set.');
    }
    return this.data[name];
  }

  /**
   * Create an instance of transaction.
   * @param {String} type
   * @param {Object} data
   */
  static create(type, data = {}) {
    if (!types[type]) {
      throw new Error('Invalid TX type in create(): ' + JSON.stringify(type))
    }
    const constructor = require(types[type]);

    return new constructor(data);
  }
}

module.exports = Tx;
