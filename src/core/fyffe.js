const Stock = require('./Stock');
const Accounts = require('./Accounts');
const Ledger = require('./Ledger');
const config = require('../config');

/**
 * A system instance for transforming and inspecting financial data.
 */
class Fyffe {

  constructor() {
    this.stock = new Stock();
    this.accounts = new Accounts();
    this.ledger = new Ledger();
    this.dbs = {};
  }

  /**
   * Initialize a named DB instance.
   * @param {String} dbName Name of the database.
   * @param {Knex} knex Knex-instance configured for the database.
   */
  setDb(dbName, knex) {
    this.dbs[dbName] = knex;
  }

  /**
   * Set up account information from `tilitin`-database.
   * @param {String} dbName
   */
  async loadAccounts(dbName) {
    return this.dbs[dbName]
      .select('id', 'number', 'name')
      .from('account')
      .then((accounts) => {
        this.accounts.loadAccounts(accounts);
      });
  }

  /**
   * Update balances from the `tilitin`-database.
   * @param {String} dbName
   */
  async loadBalances(dbName) {
    const knex = this.dbs[dbName];
    const accountNumbers = Object.keys(config.getAllAccounts());
    return Promise.all(accountNumbers.map((number) => {
      return knex.select(knex.raw('SUM(debit * amount) + SUM((debit - 1) * amount) AS total'))
        .from('entry')
        .where({account_id: this.accounts.getId(number)})
        .andWhere('description', '<>', 'Alkusaldo')
        .then((data) => {
          this.accounts.setBalance(number, data[0].total || 0);
        });
    }));
  }

  /**
   * Import data from files into the system.
   * @param {String} format
   * @param {Array<String>} files
   */
  async import(format, files) {
    const module = require('../data/import/' + format);
    let data = null;
    await module.loadFiles(files)
      .then((content) => (data = content));
    console.log(data);
  }

  async export() {
    // TODO: Mechanism to transfer data to external sink.
  }
}

module.exports = new Fyffe();
