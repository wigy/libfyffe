const config = require('../config');
var cc = require('currency-codes');

/**
 * Abstract base class for different transactions.
 */
class Tx {

  constructor(type, data = {}) {
    if (!type2class[type]) {
      throw new Error('Invalid TX type in constructor: ' + JSON.stringify(type))
    }
    if (typeof(data) !== 'object' || data === null) {
      throw new Error('Invalid initial data in constructor: ' + JSON.stringify(data))
    }
    this.data = {
      total: undefined,
      currency: undefined,
    };
    Object.keys(data).forEach((key) => {
      if (!(key in this.data)) {
        throw new Error('Invalid key' + JSON.stringify(key) + 'for transaction in ' + JSON.stringify(data));
      }
    });
    Object.assign(this, data);
  }

  /**
   * Total is sum of all entry values on the debit side.
   */
  set total(val) {
    this.isGeZero('total', val);
    this.data.total = val;
  }
  get total() {
    return this.get('total');
  }

  /**
   * Currency is the currency used in the transaction.
   */
  set currency(val) {
    this.isString('currency', val);
    this.check('currency', val, (val) => cc.code(val));
    this.data.currency = val;
  }
  get currency() {
    return this.get('currency');
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
   * Check that the value fulfills the validator function.
   * @param {String} name
   * @param {any} val
   * @param {Function} fn
   */
  check(name, val, fn) {
    if (!fn(val)) {
      throw new Error('Value ' + val + ' is not legal for ' + JSON.stringify(name));
    }
  }

  /**
   * Check that value is a finite number and not NaN.
   * @param {String} name
   * @param {any} val
   */
  isNum(name, val) {
    if (typeof(val) === 'number' && !isNaN(val) && val < Infinity && val > -Infinity) {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  }

  /**
   * Check that value is a string.
   * @param {String} name
   * @param {any} val
   */
  isString(name, val) {
    if (typeof(val) === 'string') {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  }

  /**
   * Check that value is a finite number greater or equal to zero.
   * @param {String} name
   * @param {any} val
   */
  isGeZero(name, val) {
    this.isNum(name, val);
    if (val >= 0) {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  }

  /**
   * Create an instance of transaction.
   * @param {String} type
   * @param {Object} data
   */
  static create(type, data = {}) {
    const constructor = type2class[type];
    if (!constructor) {
      throw new Error('Invalid TX type in create(): ' + JSON.stringify(type))
    }
    return new constructor(data);
  }
}

/**
 * The primary currency account is receiving funds from the bank account.
 */
class DepositTx extends Tx {

  constructor(data = {}) {
    super('deposit', data);
  }
}

/**
 * Funds are taken out from the primary currency account and restored to the bank account.
 */
class WithdrawalTx extends Tx {

  constructor(data = {}) {
    super('withdrawal', data);
  }
}

/**
 * A tradeable commodity is sold.
 */
class SellTx extends Tx {

  constructor(data = {}) {
    super('sell', data);
  }
}

/**
 * A tradeable commodity is bought.
 */
class BuyTx extends Tx {

  constructor(data = {}) {
    super('buy', data);
  }
}

/**
 * A dividend is distributed to some currency account.
 */
class DividendTx extends Tx {

  constructor(data = {}) {
    super('dividend', data);
  }
}

/**
 * The primary currency is traded to another currency.
 */
class FxInTx extends Tx {

  constructor(data = {}) {
    super('fx-in', data);
  }
}

/**
 * Another currency is traded to the primary currency.
 */
class FxOutTx extends Tx {

  constructor(data = {}) {
    super('fx-out', data);
  }
}

/**
 * An interest is paid for loan.
 */
class InterestTx extends Tx {

  constructor(data = {}) {
    super('interest', data);
  }
}

/**
 * Tradeable commodity is transferred in to the system.
 */
class MoveInTx extends Tx {

  constructor(data = {}) {
    super('move-in', data);
  }
}

/**
 * Tradeable commodity is transferred out of the system.
 */
class MoveOutTx extends Tx {

  constructor(data = {}) {
    super('move-out', data);
  }
}

const type2class = {
  deposit: DepositTx,
  withdrawal: WithdrawalTx,
  sell: SellTx,
  buy: BuyTx,
  dividend: DividendTx,
  'fx-in': FxInTx,
  'fx-out': FxOutTx,
  interest: InterestTx,
  'move-in': MoveInTx,
  'move-out': MoveOutTx,
}

module.exports = Tx;
