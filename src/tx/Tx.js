const cc = require('currency-codes');
const moment = require('moment');
const clone = require('clone');
const dump = require('neat-dump');
const http = require('request-promise-json');
const config = require('../config');
const validator = require('../data/validator');
const num = require('../util/num');
const d = require('neat-dump');

/**
 * A map from valid type names to the module paths implementing them.
 */
const types = {
  'fx-in': './FxInTx',
  'fx-out': './FxOutTx',
  'move-in': './MoveInTx',
  'move-out': './MoveOutTx',
  buy: './BuyTx',
  deposit: './DepositTx',
  dividend: './DividendTx',
  expense: './ExpenseTx',
  error: './ErrorTx',
  income: './IncomeTx',
  interest: './InterestTx',
  'loan-take': './LoanTakeTx',
  'loan-pay': './LoanPayTx',
  sell: './SellTx',
  'stock-dividend': './StockDividendTx',
  trade: './TradeTx',
  withdrawal: './WithdrawalTx'
};

/**
 * Daily rates, if known.
 */
const dailyRates = {
};

/**
 * Trading pairs fetched.
 */
const tradePairs = {
};

/**
 * Helper to recognize string date or epoch.
 * @param {String|Number} dateOrTime
 */
const toDate = (dateOrTime) => {
  let date;
  if (typeof dateOrTime === 'string') {
    date = dateOrTime;
  } else {
    date = moment.utc(dateOrTime).format('YYYY-MM-DD HH:mm:ss');
  }
  return date;
};

let stockDebugTitle = false;

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
    this.id = null;
    this.parent = null;
    this.chained = [];
    this.tags = [];
    this.service = null;
    this.fund = null;
    // Initialize defaults.
    this.data = Object.assign({
      time: undefined,
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

  toJSON() {
    return this.data;
  }

  /**
   * Transaction time
   */
  set time(val) {
    validator.isGe('time', val, 946684800000); // Jan 1st 2000
    this.data.time = val;
  }

  get time() {
    return this.get('time');
  }

  /**
   * Transaction date
   */
  set date(val) {
    throw new Error('Do not set date, but time instead for transaction.');
  }

  get date() {
    return moment(this.get('time')).format('YYYY-MM-DD');
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
    validator.isRegexMatch('target', val, /^[-.A-Z0-9]+\**?$/);
    this.data.target = val;
  }

  get target() {
    return this.get('target');
  }

  /**
   * The total amount of commodity involved in this transaction.
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
   * VAT amount added to the income or expense.
   */
  set vat(val) {
    validator.isGeZeroOrNull('vat', val);
    this.data.vat = val;
  }

  get vat() {
    return this.get('vat');
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
   * Also used as dividend per commodity.
   */
  set given(val) {
    validator.isNum('given', val);
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
    validator.isNumOrNull('burnAmount', val);
    this.data.burnAmount = val;
  }

  get burnAmount() {
    return this.get('burnAmount');
  }

  /**
   * Additional description of transaction subject.
   */
  set notes(val) {
    validator.isStringOrNull('notes', val);
    this.data.notes = val;
  }

  get notes() {
    return this.get('notes');
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
    tx.parent = this;
  }

  /**
   * Find the configured account number.
   * @param {String} arg1 Main category name in the config for accounts or account name.
   * @param {String} [arg2] Account name in the config.
   */
  getAccount(arg1, arg2 = null) {
    let name = 'accounts.' + arg1.toLowerCase();
    if (arg2) {
      name += '.' + arg2.toLowerCase();
    }
    let acc = config.get(name, this.service, this.fund);
    if (!acc && arg1 === 'targets') {
      acc = config.get('accounts.targets.default', this.service, this.fund);
    }
    if (!acc && arg1 === 'expenses') {
      acc = config.get('accounts.expenses.default', this.service, this.fund);
    }
    if (!acc && arg1 === 'incomes') {
      acc = config.get('accounts.incomes.default', this.service, this.fund);
    }
    if (!acc && arg1 === 'loans') {
      acc = config.get('accounts.loans.default', this.service, this.fund);
    }

    if (!acc) {
      throw new Error(`Account ${JSON.stringify(name)} is not configured for service ${this.service} in fund ${this.fund}.`);
    }

    return acc;
  }

  /**
   * Get full target name including service name capitalized.
   */
  getTarget() {
    if (!this.service) {
      throw new Error('Cannot get full target of null service ' + JSON.stringify(this));
    }
    return this.service.toUpperCase() + ':' + this.target;
  }

  /**
   * Get full burn target name including service.
   */
  getBurnTarget() {
    if (!this.service) {
      throw new Error('Cannot get full burn target of null service ' + JSON.stringify(this));
    }
    return this.service.toUpperCase() + ':' + this.burnTarget;
  }

  /**
   * Get full source name including service.
   */
  getSource() {
    if (!this.service) {
      throw new Error('Cannot get full source of null service ' + JSON.stringify(this));
    }
    return this.service.toUpperCase() + ':' + this.source;
  }

  /**
   * Collect all atomic transaction entries for the transaction including chained sub-transaction.
   * @return {Array<Entry>}
   */
  getEntries() {
    let ret = this.getMyEntries();
    // Add own description for child txs.
    if (this.parent) {
      ret.forEach((entry, i) => {
        ret[i].description = this.getText();
      });
    }
    if (this.chained.length) {
      this.chained.forEach((sub) => {
        const subEntries = sub.getEntries();
        ret = ret.concat(subEntries);
      });
    }

    // Add currencies.
    if (config.flags.addCurrencies) {
      const isFx = ['fx-in', 'fx-out'].includes(this.type);
      if (this.has('currency') && (this.currency !== config.currency || isFx) && this.has('rate')) {
        const text = this.getText();
        for (let i = 0; i < ret.length; i++) {
          ret[i].description = text + ' | ' + num.currency(ret[i].amount / this.rate, isFx ? this.target : this.currency);
        }
      }
    }

    return ret;
  }

  /**
   * Collect atomic transaction entries for this transaction.
   * @return {Array<Entry>}
   */
  getMyEntries() {
    throw new Error('A transaction class in ' + types[this.type] + ' does not implement `getMyEntries()`.');
  }

  /**
   * Get a summary presentation.
   */
  getTitle() {
    return this.date + ' ' + num.currency(this.total, config.currency) + ' ' + this.getText();
  }

  /**
   * Get the tags of this transaction (or its parents if none).
   */
  getTags() {
    return this.tags.length ? this.tags : (
      this.parent ? this.parent.getTags() : []
    );
  }

  /**
   * Describe the transaction and add tags.
   */
  getText() {
    const tags = this.getTags();
    const text = this.getMyText();
    return (tags.length ? '[' + tags.join('][') + '] ' : '') + text;
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
   * @return {Object<Set>}
   *
   * After updating the balance, the account number is checked and if it has a matching loan account,
   * automatic loan payment or loan take is attached to the transaction.
   *
   * If single loan update is configured, a list of loan description objects are returned:
   * {
   *   loan: 5678,
   *   account: 1234,
   *   currency: 'EUR',
   *   tags: ['A', 'B']
   * }
   */
  apply(accounts, stock, loanCheck = true) {
    const ret = [];

    const oldStock = clone(stock);
    this.updateStock(stock);

    if (config.flags.debugStock) {
      if (!stockDebugTitle) {
        dump.purple('Stock changes:');
        stockDebugTitle = true;
      }
      let title = false;
      Object.keys(stock.stock).forEach((target) => {
        const short = target.split(':')[1];
        if (oldStock.stock[target] !== stock.stock[target]) {
          if (!title) {
            title = true;
            dump.green('  ', this.getTitle());
          }
          dump.yellow('       ', target, oldStock.stock[target], '=>', stock.stock[target], short);
        }
        if (oldStock.average[target] !== stock.average[target]) {
          if (!title) {
            title = true;
            dump.green('  ', this.getTitle());
          }
          dump.yellow('       ', target, oldStock.average[target], '=>', stock.average[target], '€/' + short);
        }
      });
    }

    this.getEntries().forEach((entry) => {
      if (!entry.number) {
        throw new Error('Invalid account number found in entries ' + JSON.stringify(this.getEntries()));
      }

      const balance = accounts.transfer(entry.number, entry.amount);

      if (loanCheck && this.has('currency')) {
        const loanAcc = config.get('accounts.loans', this.service, this.fund)[this.currency.toLowerCase()];
        const curAcc = this.getAccount('currencies', this.currency);
        if (loanAcc && entry.number === curAcc) {
          // If single update for loans, then just collect notes.
          if (config.flags.singleLoanUpdate) {
            ret.push({
              loan: loanAcc,
              account: curAcc,
              currency: this.currency,
              tags: this.tags
            });
            return;
          }
          let loan;
          const loanTotal = -accounts.getBalance(loanAcc);
          // If account is negative, then it goes to loan.
          if (balance < 0) {
            loan = Tx.create('loan-take', { total: num.cents(-balance) }, this.service, this.fund);
          } else if (balance > 0 && loanTotal > 0) {
            // Otherwise we can pay back, if we still owe money.
            const payBack = Math.min(loanTotal, balance);
            if (payBack > 0.001) {
              loan = Tx.create('loan-pay', { total: num.cents(payBack) }, this.service, this.fund);
            }
          }
          if (loan) {
            this.addSubTx(loan);
            loan.apply(accounts, stock, false);
          }
        }
      }
    });

    return ret;
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
      this.stock = stock.getStock(this.getTarget());
      this.avg = stock.getAverage(this.getTarget());
    }
  }

  /**
   * Get the average for the target and throw an error if not found.
   * @param {Stock} stock
   * @param {String} target
   */
  requireAverage(stock, target) {
    const avg = stock.getAverage(target);
    if (!avg) {
      throw new Error('No average available for ' + target);
    }
    return avg;
  }

  /**
   * Create an instance of transaction.
   * @param {String} type
   * @param {Object} data
   * @param {String} [service]
   * @param {String} [fund]
   */
  static create(type, data = {}, service = null, fund = null) {
    if (!types[type]) {
      throw new Error('Invalid TX type in create(): ' + JSON.stringify(type));
    }
    const constructor = require(types[type]);
    const id = data.id || null;
    const tags = data.tags || [];
    if (id) {
      delete data.id;
    }
    if (tags) {
      delete data.tags;
    }
    const ret = new constructor(data);
    ret.service = service;
    ret.fund = fund;
    ret.id = id;
    ret.tags = tags;

    return ret;
  }

  /**
   * Collect all constructors for all transaction types.
   * @return {Object<Class>} A mapping from type names to their constructors.
   */
  static classes() {
    const ret = {};
    Object.keys(types).forEach((type) => {
      ret[type] = require(types[type]);
    });
    return ret;
  }

  /**
   * Set the daily rating for some target.
   * @param {String} date
   * @param {String} target
   * @param {Number} value
   */
  static setRate(date, target, value) {
    dailyRates[target] = dailyRates[target] || {};
    dailyRates[target][date] = value;
  }

  /**
   * Get the daily rating for some target.
   * @param {String|Number} dateOrTime
   * @param {String} target
   * @return {Promise<Number|null>}
   */
  static async fetchRate(dateOrTime, target) {

    const date = toDate(dateOrTime);

    if (target in dailyRates && date in dailyRates[target]) {
      return dailyRates[target][date];
    }

    async function _fetch(target) {
      const url = process.env.HARVEST_URL || 'http://localhost:9001';
      const json = await http.get(url + '/ticker/' + target + '/' + date)
        .catch((err) => {
          dump.error(err);
        });

      if (json) {
        return json.close === undefined ? json.price : json.close;
      }
      return null;
    }

    const backup = config.fallbackService ? config.fallbackService.toUpperCase() + ':' + target.split(':')[1] : null;
    let rate = await _fetch(target);
    if (!rate && backup) {
      rate = await _fetch(backup);
      if (rate) {
        d.warning(`Using value from fallback ${backup}.`);
      }
    }

    Tx.setRate(date, target, rate);

    return rate;
  }

  /**
   * Get the value of trading pair at the given time.
   * @param {String} date
   * @param {String} target
   * @return {Promise<Number|null>}
   */
  static async fetchTradePair(exchange, sell, buy, stamp) {
    if (exchange in tradePairs && sell in tradePairs[exchange] && buy in tradePairs[exchange][sell] && stamp in tradePairs[exchange][sell][buy]) {
      return tradePairs[exchange][sell][buy][stamp];
    }
    const url = process.env.HARVEST_URL || 'http://localhost:9001';
    const json = await http.get(`${url}/pair/${exchange}/${sell}/${buy}/${stamp}`)
      .catch(err => {
        throw new Error(err);
      });

    if (json && json.price) {
      const rate = json.price;
      return rate;
    }
    return null;
  }

  /**
   * Get the daily rating for some target if known already.
   * @param {String} date
   * @param {String} target
   * @return {Number|null}
   */
  static getRate(dateOrTime, target) {
    const date = toDate(dateOrTime);
    if (target in dailyRates && date in dailyRates[target]) {
      return dailyRates[target][date];
    }
    return null;
  }
};
