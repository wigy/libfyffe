const clone = require('clone');
const fs = require('fs');
const moment = require('moment');
const Stock = require('./Stock');
const Ledger = require('./Ledger');
const config = require('../config');
const tilitintin = require('../data/tilitintin');
const Import = require('../data/import');

/**
 * A system instance for transforming and inspecting financial data.
 */
class Fyffe {

  constructor() {
    this.stock = new Stock();
    this.ledger = new Ledger();
    this.modules = Import.modules();

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
   * Find the latest price average and stock for the commodities from the `tilitin`-database.
   * @param {String} dbName
   * @param {Array<String>} targets
   * @param {String} [date]
   */
  async loadPriceAndStock(dbName, targets, date) {
    return tilitintin.history.findPriceAndStock(this.dbs[dbName], targets, date);
  }

  /**
   * Fetch the configured service tag or throw an exception.
   * @param {String} service
   * @return {Tag}
   */
  getServiceTag(service) {
    if (!config.get('services.' + service)) {
      throw new Error('Service ' + JSON.stringify(service) + ' not configured.');
    }
    const serviceName = config.get('service', service);
    const tags = config.get('tags', service);
    if (!tags[serviceName]) {
      throw new Error('No tag configured for service ' + JSON.stringify(serviceName));
    }
    return tags[serviceName];
  }

  /**
   * Check out each file and find out matching importer for them.
   * @param {Map<String>} contents
   * @return {Map} A mapping from importer names to content recognized to belong to them.
   */
  recognize(contents) {
    let ret = {};
    Object.keys(contents).forEach((path) => {
      let found = false;
      let content = contents[path];
      for (let name in this.modules) {
        if (this.modules[name].isMine(content)) {
          ret[name] = ret[name] || [];
          ret[name].push(content);
          found = true;
          break;
        }
      }
      if (!found) {
        throw Error('Cannot figure out the importer for ' + path);
      }
    });
    return ret;
  }

  /**
   * Read in the content of files.
   * @param {Array<String>} files
   * @return {Map} An array of file contents.
   */
  readFiles(files) {
    let ret = {};
    files.forEach((path) => {
      ret[path] = fs.readFileSync(path, {encoding: 'utf-8'});
    });
    return ret;
  }

  /**
   * Parse file data for every importer and convert them to groups and pre-process.
   *
   * @param {Object} dataPerImporter
   */
  async loadFileData(dataPerImporter) {
    // Read in each data cluster.
    let ret = [];
    Object.keys(dataPerImporter).forEach((name) => {
      ret.push(this.modules[name].loadFiles(dataPerImporter[name]));
    });

    return Promise.all(ret)
      .then((data) => {
        // Replace old file content with parsed data entries.
        Object.keys(dataPerImporter).forEach((name, index) => {
          dataPerImporter[name] = data[index];
        });
        return dataPerImporter;
      })
      .then((dataPerImporter) => {
        // Form groups, i.e. array of related entries for each transaction in the data.
        Object.keys(dataPerImporter).forEach((name) => {
          dataPerImporter[name] = this.modules[name].makeGrouping(dataPerImporter[name]);
        });
        return dataPerImporter;
      })
      .then((dataPerImporter) => {
        // Preprocess each item in every group.
        Object.keys(dataPerImporter).forEach((name) => {
          for (let i = 0; i < dataPerImporter[name].length; i++) {
            for (let j = 0; j < dataPerImporter[name][i].length; j++) {
              dataPerImporter[name][i][j] = this.modules[name].trimItem(dataPerImporter[name][i][j]);
            }
          }
        });
        return dataPerImporter;
      });
  }

  /**
   * Remove all data that has been already imported.
   * @param {Object} dataPerImporter
   */
  async removeImported(knex, dataPerImporter) {
    if (config.flags.force) {
      return dataPerImporter;
    }

    return Promise.all(Object.keys(dataPerImporter).map((name) => {
      const tag = this.getServiceTag(name).tag;
      return tilitintin.imports.doneFor(knex, tag)
        .then((ids) => ({name, ids}));
    }))
      .then((imported) => {
        Object.values(imported).forEach((set) => {
          const ids = new Set(set.ids);
          dataPerImporter[set.name] = dataPerImporter[set.name].filter((group) => !ids.has(group.id));
          if (dataPerImporter[set.name].length === 0) {
            delete dataPerImporter[set.name];
          }
        });
        return dataPerImporter;
      });
  }

  /**
   * Convert raw group data to transactions and add them to the ledger.
   * @param {Object} dataPerImporter
   */
  createTransactions(dataPerImporter) {
    Object.keys(dataPerImporter).forEach((name) => {

      // Create txs.
      let txs = dataPerImporter[name].map((group) => this.modules[name].createTransaction(group, this, name));

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

      // Store the result.
      this.ledger.add(txs);
    });
  }

  /**
   * Initialize stock and average price information for the current ledger.
   * @param {String} dbName
   * @param {String} firstDate
   */
  async initializeStock(dbName, firstDate) {
    const targets = this.ledger.getTargets();
    const currencies = this.ledger.getCurrencies();
    targets.forEach((target) => this.stock.add(0, target, 0.00));
    currencies.forEach((currency) => this.stock.add(0, currency, 0.00));
    const {avg, stock} = await this.loadPriceAndStock(dbName, targets, firstDate);
    this.stock.setStock(stock);
    this.stock.setAverages(avg);
    if (config.flags.debug) {
      this.stock.showStock('Initial stock:');
    }
  }

  /**
   * Import data from files into the system.
   * @param {Array<String>} files
   * @param {Object} options
   */
  async import(files, options) {

    let dataPerImporter = this.recognize(this.readFiles(files));

    const {dbName} = options;
    const knex = this.dbs[dbName];

    // Get initial data.
    await this.loadTags(dbName);
    await this.loadAccounts(dbName);

    dataPerImporter = await this.loadFileData(dataPerImporter);
    dataPerImporter = await this.removeImported(knex, dataPerImporter);

    // Sort them according to the timestamps and find the earliest timestamp.
    let minDate = null;
    Object.keys(dataPerImporter).forEach((name) => {
      const sorter = (a, b) => {
        return this.modules[name].time(a[0]) - this.modules[name].time(b[0]);
      };
      dataPerImporter[name] = dataPerImporter[name].sort(sorter);
      let first = this.modules[name].time(dataPerImporter[name][0][0]);
      if (minDate === null || first < minDate) {
        minDate = first;
      }
    });

    // Get starting balances for accounts.
    let firstDate = moment(minDate).format('YYYY-MM-DD');
    await this.loadBalances(dbName, firstDate);
    if (config.flags.debug) {
      this.ledger.accounts.showBalances('Initial balances:');
    }

    // Convert raw group data to transactions and add them to ledger.
    this.createTransactions(dataPerImporter);

    await this.initializeStock(dbName, firstDate);

    // Finally apply all transactions.
    // TODO: Apply loans.
    this.ledger.apply(this.stock);

    if (config.flags.debug) {
      this.ledger.showTransactions('Transactions:');
      this.stock.showStock('Final stock:');
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
