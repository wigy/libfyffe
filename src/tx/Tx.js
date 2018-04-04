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
  trade: './TradeTx'
};

let nextId = 1;

/**
 * Abstract base class for different transactions.
 */
module.exports = class Tx {

  /**
   * Construct a transaction.
   * @param {String} type Lower-case name of the transaction type.
   * @param {Object} add Additional fields to define.
   * @param {Object} data Actual data content to initialize.
   */
  constructor(type, add = {}, data = {}) {
    // Check the input.
    if (!types[type]) {
      throw new Error('Invalid TX type in constructor: ' + JSON.stringify(type));
    }
    if (typeof (data) !== 'object' || data === null) {
      throw new Error('Invalid initial data in constructor: ' + JSON.stringify(data));
    }
    this.type = type;
    this.id = nextId++;
    this.chained = [];
    this.tags = [];

    // Initialize defaults.
    this.data = Object.assign({
      date: undefined,
      total: undefined
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
   * Transaction date
   */
  set date(val) {
    validator.isRegexMatch('date', val, /^\d\d\d\d-\d\d-\d\d$/);
    this.data.date = val;
  }
  get date() {
    return this.get('date');
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
   * The total amount of commodity changed owner in this transaction.
   *
   * Negative for giving out and positive when receiving.
   */
  set amount(val) {
    validator.isNum('amount', val);
    this.data.amount = val;
  }
  get amount() {
    return this.get('amount');
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
    validator.isRegexMatchOrNull('burnTarget', val, /^[-A-Z0-9]+\**?$/);
    this.data.burnTarget = val;
  }
  get burnTarget() {
    return this.get('burnTarget');
  }

  /**
   * The total amount of commodity needed to pay this transaction.
   */
  set burnAmount(val) {
    validator.isLtZeroOrNull('burnAmount', val);
    this.data.burnAmount = val;
  }
  get burnAmount() {
    return this.get('burnAmount');
  }

  /**
   * Verify that the given field is set and get its value.
   * @param {String} name
   * @return {any} Value of the field if set.
   */
  get(name) {
    if (!this.has(name)) {
      throw new Error('Value ' + name + ' for tx ' + JSON.stringify(this.data) + ' not set.');
    }
    return this.data[name];
  }

  /**
   * Check if the given field is set.
   * @param {String} name
   * @return {Boolean} True if set.
   */
  has(name) {
    return this.data[name] !== undefined;
  }

  /**
   * Append another sub-transaction as a combined part of this transaction.
   * @param {Tx} tx
   */
  addSubTx(tx) {
    this.chained.push(tx);
  }

  /**
   * Find the configured account number.
   * @param {String} arg1 Main category name in the config for accounts or account name.
   * @return {String} [arg2] Account name in the config.
   */
  getAccount(arg1, arg2 = null) {
    let acc;
    let conf = config.accounts;
    if (arg2 !== null) {
      conf = conf[arg1];
      if (!conf) {
        throw new Error('There is no such configured account category as ' + JSON.stringify(arg1));
      }
      acc = arg2;
    } else {
      acc = arg1;
    }

    acc = acc.toLowerCase();
    if (!(acc in conf)) {
      if (conf.default !== null) {
        return conf.default;
      }
    }
    if (!(acc in conf)) {
      throw new Error('There is no such configuration for an account as ' + JSON.stringify(acc));
    }

    const ret = conf[acc];
    if (!ret) {
      throw new Error('Account ' + JSON.stringify(acc) + ' is not configured.');
    }

    return ret;
  }

  /**
   * Collect all atomic transaction entries for the transaction including chained sub-transaction.
   * @param {Boolean} withText If set, add description to each entry.
   * @return {Array<Entry>}
   */
  getEntries(withText = false) {
    if (!withText) {
      return this.getMyEntries().concat(this.chained.map((tx) => tx.getEntries()));
    }

    let ret = [];
    const text = this.getText();
    this.getMyEntries().forEach((entry) => {
      entry.description = text;
      ret.push(entry);
    });

    return ret.concat(this.chained.map((tx) => tx.getEntries(true)));
  }

  /**
   * Collect atomic transaction entries for this transaction.
   * @return {Array<Entry>}
   */
  getMyEntries() {
    throw new Error('A transaction class in ' + types[this.type] + ' does not implement `getEntries()`.');
  }

  /**
   * Describe the transaction and add tags.
   */
  getText() {
    const tags = this.tags.length ? '[' + this.tags.join('][') + '] ' : '';
    return tags + this.getMyText();
  }

  /**
   * Describe the transaction.
   */
  getMyText() {
    throw new Error('A transaction class in ' + types[this.type] + ' does not implement `getMyText()`.');
  }

  /**
   * Apply the transaction to the stock and accounts.
   * @param {Accounts} accounts
   * @param {Stock} stock
   */
  apply(accounts, stock) {
    this.getEntries().forEach((entry) => {
      if (!entry.number) {
        throw new Error('Invalid account number found in entries ' + JSON.stringify(this.getEntries()));
      }
      accounts.transfer(entry.number, entry.amount);
    });
    this.updateStock(stock);
  }

  /**
   * Update stock according to this transaction.
   * @param {Stock} stock
   */
  updateStock(stock) {
    throw new Error('A transaction class in ' + types[this.type] + ' does not implement `updateStock()`.');
  }

  /**
   * Retrieve stock and average price from stock for transactions using them.
   * @param {Stock} stock
   */
  updateFromStock(stock) {
    if ('stock' in this.data && this.has('target')) {
      this.stock = stock.getStock(this.target);
      this.avg = stock.getAverage(this.target);
    }
  }

  /**
   * Create an instance of transaction.
   * @param {String} type
   * @param {Object} data
   */
  static create(type, data = {}) {
    if (!types[type]) {
      throw new Error('Invalid TX type in create(): ' + JSON.stringify(type));
    }
    const constructor = require(types[type]);

    return new constructor(data);
  }

  /**
   * Collect all constructors for all transaction types.
   * @return {Object<Class>} A mapping from type names to their constructors.
   */
  static classes() {
    let ret = {};
    Object.keys(types).forEach((type) => {
      ret[type] = require(types[type]);
    });
    return ret;
  }
};
