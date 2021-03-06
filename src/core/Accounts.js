const num = require('../util/num');
const config = require('../config');
const dump = require('neat-dump');

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
   * Get the account by its number.
   */
  get(number) {
    return this.accounts[number] || null;
  }

  /**
   * Get the balance of the account by its number.
   * @return {Number|null}
   */
  getBalance(number) {
    return this.accounts[number] ? this.accounts[number].balance : null;
  }

  /**
   * Set the balance for account.
   * @param {String} number
   * @param {Number} balance
   */
  setBalance(number, balance) {
    if (!this.accounts[number]) {
      throw new Error(`No such account as ${number}.`);
    }
    this.accounts[number].balance = balance;
  }

  /**
   * Transfer the given amount to/from account.
   * @param {String} number
   * @param {Number} amount
   * @return {Number}
   */
  transfer(number, amount) {
    this.accounts[number].balance = (this.accounts[number].balance || 0) + amount;
    return this.accounts[number].balance;
  }

  /**
   * Display currently loaded balances.
   */
  showBalances(title) {
    dump.purple(title);
    Object.values(this.accounts).sort((a, b) => a.number < b.number ? -1 : (a.number > b.number ? 1 : 0)).forEach((account) => {
      if (account.balance !== null) {
        dump.yellow('  ', account.number, account.name);
        dump.green('       ', num.currency(account.balance, config.currency));
      }
    });
  }
};
