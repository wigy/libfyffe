const num = require('../util/num');
const config = require('../config');
const d = require('neat-dump');

/**
 * A container class for storing account balances.
 */
module.exports = class Stock {

  constructor() {
    this.loadAccounts([]);
  }

  /**
   * Set up account structure.
   * @param {Array<Object>} accounts
   */
  loadAccounts(accounts) {
    this.accounts = {};
    accounts.forEach((account) => {
      this.accounts[account.number] = account;
      this.setBalance(account.number, null);
    });
  }

  /**
   * Get the account ID by its number.
   */
  getId(number) {
    return this.accounts[number].id || null;
  }

  /**
   * Set the balance for account.
   * @param {String} number
   * @param {Number} balance
   */
  setBalance(number, balance) {
    this.accounts[number].balance = balance;
  }

  /**
   * Display currently loaded balances.
   */
  showBalances(title) {
    d.purple(title);
    Object.values(this.accounts).forEach((account) => {
      if (account.balance !== null) {
        d.yellow('  ', account.number, account.name);
        d.yellow('       ', num.currency(account.balance, config.currency));
      }
    });
  }
};
