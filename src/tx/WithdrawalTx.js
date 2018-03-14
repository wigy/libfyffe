const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');

/**
 * Funds are taken out from the primary currency account and restored to the bank account.
 */
module.exports = class WithdrawalTx extends Tx {

  constructor(data = {}) {
    super('withdrawal', { fee: 0.0 }, data);
  }

  getEntries() {
    if (this.fee) {
      return [
        {number: this.getAccount('bank'), amount: num.cents(this.total - this.fee)},
        {number: this.getAccount('fees'), amount: num.cents(this.fee)},
        {number: this.getAccount('currencies', config.currency), amount: num.cents(-this.total)}
      ];
    }
    return [
      {number: this.getAccount('bank'), amount: num.cents(this.total)},
      {number: this.getAccount('currencies', config.currency), amount: num.cents(-this.total)}
    ];
  }

  getText() {
    return text.tx(this);
  }
};
