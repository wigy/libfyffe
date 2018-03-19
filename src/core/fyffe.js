const promiseSeq = require('promise-sequential');
const Stock = require('./Stock');
const Ledger = require('./Ledger');
const config = require('../config');
const tilitintin = require('../data/tilitintin');

/**
 * A system instance for transforming and inspecting financial data.
 */
class Fyffe {

  constructor() {
    this.stock = new Stock();
    this.ledger = new Ledger();
    // Configured and named knex-instances.
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
   * Load tag information from `tilitin`-database and add to config.
   * @param {String} dbName
   */
  async loadTags(dbName) {
    return tilitintin.tags.getAll(this.dbs[dbName])
      .then((data) => {
        data.forEach((tag) => {
          if (config.tags[tag.name]) {
            throw new Error('Duplicate tag ' + JSON.stringify(tag) + ' in config ' + JSON.stringify(config.tags[tag.name]));
          }
          if (config.tags[tag.tag]) {
            throw new Error('Duplicate tag ' + JSON.stringify(tag) + ' in config ' + JSON.stringify(config.tags[tag.tag]));
          }
          config.tags[tag.tag] = tag;
          config.tags[tag.name] = tag;
        });
      });
  }

  /**
   * Set up account information from `tilitin`-database.
   * @param {String} dbName
   */
  async loadAccounts(dbName) {
    return tilitintin.accounts.getAll(this.dbs[dbName])
      .then((accounts) => {
        this.ledger.accounts.loadAccounts(accounts);
      });
  }

  /**
   * Update balances from the `tilitin`-database.
   * @param {String} dbName
   */
  async loadBalances(dbName) {
    return tilitintin.accounts.getBalances(this.dbs[dbName], Object.keys(config.getAllAccounts()))
      .then((data) => {
        Object.keys(data).forEach((num) => (this.ledger.accounts.setBalance(num, data[num])));
      });
  }

  /**
   * Fetch the configured service tag or throw an exception.
   * @return {Tag}
   */
  getServiceTag() {
    if (!config.service) {
      throw new Error('Service not configured.');
    }
    if (!config.tags[config.service]) {
      throw new Error('No tag configured for service ' + JSON.stringify(config.service));
    }
    return config.tags[config.service];
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
    data = await (async () => {
      if (config.flags.force) {
        return data;
      }
      const promises = data.map((group) => () => tilitintin.imports.has(knex, this.getServiceTag().tag, group.id));
      return promiseSeq(promises)
        .then((results) => {
          return data.filter((group, i) => !results[i]);
        });
    })();

    // Sort it according to the timestamps.
    const sorter = (a, b) => {
      return importer.time(a[0]) - importer.time(b[0]);
    };
    data = data.sort(sorter);

    // Preprocess each item in every group.
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        data[i][j] = importer.trimItem(data[i][j]);
      }
    }

    // Convert raw group data to transactions.
    let txs = data.map((group) => importer.createTransaction(group));
    this.ledger.add(txs);

    // Initialize stock for commodities and currencies.
    this.ledger.getTargets().forEach((target) => this.stock.add(0, target, 0.00));
    this.ledger.getCurrencies().forEach((currency) => this.stock.add(0, currency, 0.00));
    // TODO: Implement collectHistory() from legacy import.

    this.ledger.apply(this.stock);
  }

  async export() {
    // TODO: Mechanism to transfer data to external sink.
  }
}

module.exports = new Fyffe();
