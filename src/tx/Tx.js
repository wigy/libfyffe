/**
 * Abstract base class for different transactions.
 */
class Tx {

  constructor(type) {
    if (!type2class[type]) {
      throw new Error('Invalid TX type in constructor: ' + JSON.stringify(type))
    }
  }

  static create(type) {
    const constructor = type2class[type];
    if (!constructor) {
      throw new Error('Invalid TX type in create(): ' + JSON.stringify(type))
    }
    return new constructor();
  }
}

/**
 * The primary account is receiving funds from outside.
 */
class DepositTx extends Tx {

  constructor() {
    super('deposit');
  }
}

/**
 * Funds are taken out from the primary account.
 */
class WithdrawalTx extends Tx {

  constructor() {
    super('withdrawal');
  }
}

/**
 * A tradeable commodity is sold.
 */
class SellTx extends Tx {

  constructor() {
    super('sell');
  }
}

/**
 * A tradeable commodity is bought.
 */
class BuyTx extends Tx {

  constructor() {
    super('buy');
  }
}

/**
 * A dividend is distributed to some currency account.
 */
class DividendTx extends Tx {

  constructor() {
    super('dividend');
  }
}

/**
 * The primary currency is traded to another currency.
 */
class FxInTx extends Tx {

  constructor() {
    super('fx-in');
  }
}

/**
 * Another currency is traded to the primary currency.
 */
class FxOutTx extends Tx {

  constructor() {
    super('fx-out');
  }
}

/**
 * An interest is paid for loan.
 */
class InterestTx extends Tx {

  constructor() {
    super('interest');
  }
}

/**
 * Tradeable commodity is transferred in to the system.
 */
class MoveInTx extends Tx {

  constructor() {
    super('move-in');
  }
}

/**
 * Tradeable commodity is transferred out of the system.
 */
class MoveOutTx extends Tx {

  constructor() {
    super('move-out');
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
