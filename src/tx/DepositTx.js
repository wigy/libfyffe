const Tx = require('./Tx');

/**
 * The primary currency account is receiving funds from the bank account.
 */
module.exports = class DepositTx extends Tx {

  constructor(data = {}) {
    super('deposit', {}, data);
  }
}
