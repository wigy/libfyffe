const config = require('../config');

/**
 * Abstract base class for different transactions.
 */
class Tx {

  constructor(type, data = {}) {
    if (!type2class[type]) {
      throw new Error('Invalid TX type in constructor: ' + JSON.stringify(type))
    }
    this.data = {};
    Object.assign(this, data);
  }

  set total(val) {
    // TODO: Validate and add the rest fields.
    this.data.total = val;
  }

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
    super('fx-out', 'data');
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
