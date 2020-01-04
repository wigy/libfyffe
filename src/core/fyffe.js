const fs = require('fs');
const moment = require('moment');
const dump = require('neat-dump');
const dce = require('detect-character-encoding');
const Stock = require('./Stock');
const Ledger = require('./Ledger');
const config = require('../config');
const tilitintin = require('../data/tilitintin');
const Import = require('../data/import');
const { Tx } = require('../tx');

/**
 * A system instance for transforming and inspecting financial data.
 */
class Fyffe {

  constructor() {
    this.service = null;
    this.fund = null;
    this.stock = new Stock();
    this.ledger = new Ledger();
    this.modules = Import.modules();
    // Explicitly set averages.
    this.initialAverages = {};
    // Explicitly set stock.
    this.initialStock = {};
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
   * Set the explicit initial averages.
   * @param {Object} avgs
   */
  setAverages(avgs) {
    this.initialAverages = avgs;
  }

  /**
   * Set the explicit initial stock.
   * @param {Object} stock
   */
  setStock(stock) {
    this.initialStock = stock;
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
   * @param {Array<String>} [targets]
   * @param {String} [date]
   */
  async loadPriceAndStock(dbName, targets = null, date = null) {
    return tilitintin.history.findPriceAndStock(this.dbs[dbName], targets, date);
  }

  /**
   * Fetch the configured service tag or null.
   * @param {String} service
   * @return {Tag}
   */
  getServiceTag(service) {
    if (!config.get('services.' + service)) {
      throw new Error('Service ' + JSON.stringify(service) + ' not configured.');
    }
    const tags = config.get('tags', service);
    return tags[service] || null;
  }

  /**
   * Fetch the configured fund tag or null.
   * @param {String} fund
   * @return {Tag}
   */
  getFundTag(service, fund) {
    if (!config.get('services.' + service + '.funds.' + fund)) {
      throw new Error('Service + fund ' + JSON.stringify(service + ' + ' + fund) + ' not configured.');
    }
    const tags = config.get('tags', service, fund);
    return tags[fund] || null;
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
      const buf = fs.readFileSync(path);
      const { encoding } = dce(buf);
      ret[path] = buf.toString(encoding);
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
      this.modules[name].init();
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
          // Drop entries before starting date.
          if (config.flags.startDate) {
            const timestamp = new Date(config.flags.startDate).getTime();
            dataPerImporter[name] = dataPerImporter[name].filter(group => group.timestamp >= timestamp);
          }
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
      let tag = this.service + ':' + this.fund;
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
   * Pick all target names as seen in the import data (skip import errors).
   * @param {Object} dataPerImporter
   * @param {Set<String>} [ignore] Ignore these transactions.
   * @return {Set<String>}
   */
  scanTargets(dataPerImporter, ignore = new Set()) {
    let txs = new Set();
    Object.keys(dataPerImporter).forEach((name) => {
      dataPerImporter[name].forEach((group) => {
        try {
          let tx = this.modules[name].createTransaction(group, this, ignore);
          txs.add(tx.getTarget());
          txs.add(tx.getSource());
        } catch (err) {}
      });
    });
    return txs;
  }

  /**
   * Fetch the rate for the ticker.
   */
  async fetchRate(date, service, target) {
    const ticker = service.toUpperCase() + ':' + target;
    return Tx.fetchRate(date, ticker);
  }

  /**
   * Convert raw group data to transactions and store them to the ledger.
   * @param {Object} dataPerImporter
   * @param {Set<String>} [ignore] Ignore these transaction types.
   */
  async createTransactions(dataPerImporter, ignore = new Set()) {
    for (const name of Object.keys(dataPerImporter)) {

      // Create txs.
      let txs = [];
      for (const group of dataPerImporter[name]) {
        try {
          let tx = this.modules[name].createTransaction(group, this);
          if (ignore.has(tx.type)) {
            continue;
          }
          if (tx) {
            if (config.flags.tradeProfit && tx.type === 'trade') {
              await this.fetchRate(tx.date, tx.service, tx.target);
            }
            txs.push(tx);
          } else {
            dump.warning('Skipping', group);
          }
        } catch (err) {
          if (config.flags.skipErrors || config.flags.stopOnError) {
            dump.error('==================');
            dump.error('  Import failed:');
            dump.error('==================');
            console.log(group);
            console.log();
            console.log(err);
            dump.error('__________________');
            if (config.flags.stopOnError) {
              break;
            }
          } else if (config.flags.importErrors) {
            const raw = this.modules[name].rawValue(group);
            let tx;
            const acc = config.get('accounts.bank');
            if (raw < 0) {
              tx = Tx.create('error', {total: -raw, target: acc, notes: 'out', time: group.timestamp, id: group.id});
            } else {
              tx = Tx.create('error', {total: raw, target: acc, notes: 'in', time: group.timestamp, id: group.id});
            }
            txs.push(tx);
          } else {
            throw err;
          }
        }
      }

      // Add tags based on the configuration.
      txs.forEach((tx) => {
        const fundTag = config.getTag(tx.fund);
        const serviceTag = config.getTag(tx.service);
        if (fundTag) {
          tx.tags.push(fundTag.tag);
        }
        if (serviceTag) {
          tx.tags.push(serviceTag.tag);
        }
      });

      // Store the result.
      this.ledger.add(txs);
    }
  }

  /**
   * Initialize stock and average price information for the current ledger.
   * @param {String} dbName
   * @param {String} firstDate
   * @param {Set<String>} targets
   */
  async initializeStock(dbName, firstDate, targets) {
    const {avg, stock} = await this.loadPriceAndStock(dbName, firstDate, targets);
    Object.assign(stock, this.initialStock);
    this.stock.setStock(stock);
    Object.assign(avg, this.initialAverages);
    this.stock.setAverages(avg);
    if (config.flags.showStock) {
      this.stock.showStock('Initial stock:');
    }
  }

  /**
   * Import data from files into the system.
   * @param {Array<String>} files
   * @param {Object} options
   * @param {String} options.dbName Name of the database to use.
   * @param {String} options.service Name of the configuration section to use.
   * @param {String} options.fund Name of the configuration section to use.
   * @param {Set} options.ignore Drop transactions of this type.
   */
  async import(files, options) {
    this.service = options.service;
    this.fund = options.fund;
    let dataPerImporter = this.recognize(this.readFiles(files));

    const {dbName} = options;
    const knex = this.dbs[dbName];

    // Get initial data.
    await this.loadTags(dbName);
    await this.loadAccounts(dbName);

    Object.keys(dataPerImporter).forEach((name) => {
      this.modules[name].setFundAndService(options.fund, options.service);
    });

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
    if (config.flags.showBalances) {
      this.ledger.accounts.showBalances('Initial balances:');
    }

    const targets = await this.scanTargets(dataPerImporter, options.ignore || new Set());
    await this.initializeStock(dbName, firstDate, targets);

    // Convert raw group data to transactions and add them to ledger.
    await this.createTransactions(dataPerImporter, options.ignore || new Set());

    // Finally apply all transactions.
    this.ledger.apply(this.stock);

    if (config.flags.debug) {
      this.ledger.showTransactions('Transactions:');
    }
    if (config.flags.showStock) {
      this.stock.showStock('Final stock:');
    }
    if (config.flags.showBalances) {
      this.ledger.accounts.showBalances('Final balances:');
    }
  }

  /**
   * Export data from the system to the external storage.
   * @param {String} format
   * @param {Object} options
   * @param {String} options.dbName Name of the database to use.
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
