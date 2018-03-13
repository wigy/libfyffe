const Tx = require('./Tx');

/**
 * Funds are taken out from the primary currency account and restored to the bank account.
 */
module.exports = class WithdrawalTx extends Tx {

  constructor(data = {}) {
    super('withdrawal', {}, data);
  }
}
