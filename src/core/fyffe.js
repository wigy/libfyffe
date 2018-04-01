const clone = require('clone');
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
   * @param {String} date
   */
  async loadBalances(dbName, date = null) {
    return tilitintin.accounts.getBalances(this.dbs[dbName], Object.keys(config.getAllAccounts()), date)
      .then((data) => {
        Object.keys(data).forEach((num) => (this.ledger.accounts.setBalance(num, data[num])));
      });
  }

  /**
   * Find the latest price average for the commodities from the `tilitin`-database.
   * @param {String} dbName
   * @param {Array<String>} targets
   * @param {String} [date]
   */
  async loadLastPrice(dbName, targets, date) {
    return tilitintin.history.findPrice(this.dbs[dbName], targets, date);
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
   * @param {String} format
   * @param {Array<String>} files
   * @param {Object} options
   */
  async import(format, files, options) {
    const {dbName} = options;
    const knex = this.dbs[dbName];
    const importer = require('../data/import/' + format);

    await this.loadTags(dbName);
    await this.loadAccounts(dbName);

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
    if (data.length === 0) {
      return;
    }

    // Sort it according to the timestamps.
    const sorter = (a, b) => {
      return importer.time(a[0]) - importer.time(b[0]);
    };
    data = data.sort(sorter);

    // Find the first date and get balances for it.
    const firstDate = importer.date(data[0][0]);
    await this.loadBalances(dbName, firstDate);
    if (config.flags.debug) {
      this.ledger.accounts.showBalances('Initial balances:');
    }

    // Preprocess each item in every group.
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        data[i][j] = importer.trimItem(data[i][j]);
      }
    }

    // Convert raw group data to transactions.
    let txs = data.map((group) => importer.createTransaction(group, this));
    this.ledger.add(txs);

    // Add tags based on the configuration.
    const fundTag = config.tags[config.fund];
    const serviceTag = config.tags[config.service];
    let tags = [];
    if (fundTag) {
      tags.push(fundTag.tag);
    }
    if (serviceTag) {
      tags.push(serviceTag.tag);
    }
    if (tags.length) {
      txs.forEach((tx) => (tx.tags = clone(tags)));
    }

    // Initialize stock and average for commodities and currencies.
    this.ledger.getTargets().forEach((target) => this.stock.add(0, target, 0.00));
    this.ledger.getCurrencies().forEach((currency) => this.stock.add(0, currency, 0.00));
    const averages = await this.loadLastPrice(dbName, this.ledger.getTargets(), firstDate);
    this.stock.setAverages(averages);
    if (config.flags.debug) {
      this.stock.showAverages('Averages:');
    }

    // TODO: Fix rounding errors.
    // TODO: Apply loans.
    // TODO: Post-processing for move-in/move-out.
    this.ledger.apply(this.stock);

    if (config.flags.debug) {
      this.ledger.showTransactions('Transactions:');
      this.ledger.accounts.showBalances('Final balances:');
    }
  }

  /**
   * Export data from the system to the external storage.
   * @param {String} format
   * @param {Object} options
   */
  async export(format, options) {
    if (config.flags.dryRun) {
      return;
    }
    const {dbName} = options;
    const knex = this.dbs[dbName];
    const exporter = require('../data/export/' + format);
    const exportOptions = {
      ledger: this.ledger,
      accounts: this.accounts,
      stock: this.stock
    };
    await exporter.export(knex, exportOptions);
  }
}

module.exports = new Fyffe();
