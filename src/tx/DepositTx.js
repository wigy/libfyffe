const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../util/text');

/**
 * The primary currency account is receiving funds from the bank account.
 */
module.exports = class DepositTx extends Tx {

  constructor(data = {}) {
    super('deposit', { fee: 0.0 }, data);
  }

  getEntries() {
    if (this.fee) {
      const amount = num.cents(this.total - this.fee);
      return [
        {number: this.getAccount('currencies', config.currency), amount: num.cents(amount)},
        {number: this.getAccount('fees'), amount: num.cents(this.fee)},
        {number: this.getAccount('bank'), amount: num.cents(-this.total)},
      ];
    }
    return [
      {number: this.getAccount('currencies', config.currency), amount: num.cents(this.total)},
      {number: this.getAccount('bank'), amount: num.cents(-this.total)},
    ];
  }

  getText() {
    return text.tx(this);
  }
}
