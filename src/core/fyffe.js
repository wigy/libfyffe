const promiseSeq = require('promise-sequential');
const Stock = require('./Stock');
const Accounts = require('./Accounts');
const Ledger = require('./Ledger');
const config = require('../config');
const tilitintin = require('../data/tilitintin');

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
    // TODO: Move to data/tilitintin
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
    // TODO: Move to data/tilitintin
    const knex = this.dbs[dbName];
    const accountNumbers = Object.keys(config.getAllAccounts());
    // TODO: Find the last period and count it from there.
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
   * @param {String} dbName
   * @param {String} format
   * @param {Array<String>} files
   */
  async import(dbName, format, files) {
    const knex = this.dbs[dbName];
    const importer = require('../data/import/' + format);

    // Collect raw data.
    let data = null;
    await importer.loadFiles(files)
      .then((content) => (data = content));

    // Form groups and remove those already imported.
    data = importer.makeGrouping(data);
    // TODO: Service tags?
    data = await (async () => {
      const promises = data.map((group) => () => tilitintin.imports.has(knex, 'CoinM', group.id));
      return promiseSeq(promises)
        .then((results) => {
          return data.filter((group, i) => !results[i]);
        });
    })();
  }

  async export() {
    // TODO: Mechanism to transfer data to external sink.
  }
}

module.exports = new Fyffe();
