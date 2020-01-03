const fs = require('fs');
const csv = require('csvtojson');
const Tx = require('../../tx/Tx');
const StringMapper = require('../../text/StringMapper');
const config = require('../../config');

/**
 * Base class for importing data.
 */
class Import {

  constructor(name) {
    this.name = name;
    this.service = null;
    this.fund = null;
    this.mapper = null;
    // Initialized when creating transactions.
    this.stock = null;
    this.ledger = null;
    this.idsUsed = new Set();
    this.ids = new Set();
  }

  /**
   * Reset import.
   */
  init() {
    this.idsUsed = new Set();
    this.ids = new Set();
  }

  /**
   * Select the configuration section to use.
   * @param {String} service
   */
  setFundAndService(fund, service) {
    this.fund = fund;
    this.service = service;
    this.mapper = new StringMapper(config.get('import', service, fund) || {});
  }

  /**
   * A mapping of module names to module instances.
   * @return {Map}
   */
  static modules() {
    let ret = new Map();
    fs.readdirSync(__dirname).filter((file) => file !== 'index.js').map((file) => file.replace(/\.js$/, ''))
      .forEach((name) => {
        ret[name] = require('./' + name);
      });

    return ret;
  }

  /**
   * Check if the file content given as a string belongs to this importer.
   * @param {String} content
   */
  isMine(content) {
    throw new Error('Importer does not implement isMine().');
  }

  /**
   * Read in the data from the file and store it internally.
   * @param {String} file A path to the file.
   * @return {Promise<any>} Promise resolving to the parsed data.
   */
  async load(file) {
    throw new Error('Importer does not implement load().');
  }

  /**
   * Load a list of file contents.
   * @param {Array<String>} files
   */
  async loadFiles(files) {
    return Promise.all(files.map((file) => this.load(file)))
      .then((data) => data.reduce((prev, cur) => prev.concat(cur), []));
  }

  /**
   * A loader for CSV file.
   *
   * @param {String} file A file content.
   * @param {Object} opts Options for CSV-reader.
   * @return {Promise<Array<Object>>}
   *
   * The first row is assumed to have headers and they are used to construct
   * an array of objects containing each row as members defined by the first header row.
   * Special option `headers` can be given as an explicit list of headers.
   * If `cutFromBeginning` is set, then remove this many lines from the beginning.
   */
  async loadCSV(file, opts = {}) {
    return new Promise((resolve, reject) => {

      let headers = null;
      opts.noheader = true;

      let lines = [];

      csv(opts)
        .fromString(file)
        .on('csv', (row) => {
          if (opts.cutFromBeginning) {
            opts.cutFromBeginning--;
          } else if (headers === null) {
            headers = opts.headers || row.map(r => r.replace(/\W/g, '_'));
            headers = headers.map((header, i) => header || 'Column' + (i + 1));
          } else {
            let line = {};
            for (let i = 0; i < row.length; i++) {
              line[headers[i]] = row[i];
            }
            line.__lineNumber = lines.length + 1;
            lines.push(line);
          }
        })
        .on('done', () => {
          resolve(lines);
        });
    });
  }

  /**
   * Generate unique transaction ID.
   * @param {Array<Object>} group
   */
  id(group) {
    throw new Error('Importer does not implement id().');
  }

  /**
   * Get the timestamp for the transaction.
   * @param {Object} entry Original data entry.
   * @return {number} A timestamp.
   */
  time(entry) {
    throw new Error('Importer does not implement time().');
  }

  /**
   * Reorganize entries so that they are grouped to the arrays forming one single transaction.
   *
   * @param {Array<any>} entries
   * @return {Promise<Array<Array<any>>>}
   */
  grouping(entries) {
    throw new Error('Importer does not implement grouping().');
  }

  /**
   * Recognize the type of the transaction.
   *
   * @param {Array<Object>} group A source data group.
   * @return {string} One of the valid transaction types.
   */
  recognize(group) {
    throw new Error('Importer does not implement recognize().');
  }

  /**
   * Look up for the trade target
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {string}
   */
  target(group, obj) {
    throw new Error('Importer does not implement target().');
  }

  /**
   * Look up for the trade source
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {string}
   */
  source(group, obj) {
    throw new Error('Importer does not implement source().');
  }

  /**
   * Calculate transaction total as positive number.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number}
   */
  total(group, obj) {
    throw new Error('Importer does not implement total().');
  }

  /**
   * Parse raw transaction value used as backup on failed import.
   *
   * @param {Array<Object>} group A source data group.
   * @return {Number}
   */
  rawValue(group) {
    throw new Error('Importer does not implement rawValue().');
  }

  /**
   * Find out currency as 'EUR' or 'USD'.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {String}
   */
  currency(group, obj) {
    throw new Error('Importer does not implement currency().');
  }

  /**
   * Find out currency conversion rate to default currency.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number}
   */
  rate(group, obj) {
    throw new Error('Importer does not implement rate().');
  }

  /**
   * Look up for the amount of the target to trade.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number} Amount traded.
   */
  amount(group, obj) {
    throw new Error('Importer does not implement amount().');
  }

  /**
   * Look up for the amount of the target to give away in trade (also dividend amount per stock).
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number} Amount given.
   */
  given(group, obj) {
    throw new Error('Importer does not implement given().');
  }

  /**
   * Look up for the service fee.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number} Service fee.
   */
  fee(group, obj) {
    throw new Error('Importer does not implement fee().');
  }

  /**
   * Look up for the tax.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number} Amount of tax deducted.
   */
  tax(group, obj) {
    throw new Error('Importer does not implement tax().');
  }

  /**
   * Look up for the VAT.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number} Amount of VAT to apply.
   */
  vat(group, obj) {
    throw new Error('Importer does not implement vat().');
  }

  /**
   * Look up for the trade target to be consumed in the transaction.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {string}
   */
  burnTarget(group, obj) {
    throw new Error('Importer does not implement burnTarget().');
  }

  /**
   * Look up for the amount of the target to consume in the transaction.
   *
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   * @return {Number} Amount traded.
   */
  burnAmount(group, obj) {
    throw new Error('Importer does not implement burnAmount().');
  }

  /**
   * Get the additional description for the transaction.
   * @param {Array<Object>} group A source data group.
   * @param {Object} obj Data known so far.
   */
  notes(group, obj) {
    throw new Error('Importer does not implement notes().');
  }

  /**
   * Get the custom tags to be added to the transaction.
   * @return {String[]}
   */
  tags(group, obj) {
    return [];
  }

  /**
   * Fallback ID if nothing better available for identifying transactions.
   */
  dateAndLineId(group) {
    let id = this.time(group[0]);
    id += ':';
    id += group.map((group) => group.__lineNumber).sort((a, b) => a - b).join(',');
    return id;
  }

  /**
   * Split input data to groups and generate IDs and timestamps.
   * @param {Array<any>} entries
   * @return {Promise<Array<Array<any>>>}
   */
  makeGrouping(entries) {
    let groups = this.grouping(entries);
    // Generate IDs and timestamps.
    groups.forEach((group, i) => {
      const id = this.id(group);
      if (this.idsUsed.has(id)) {
        console.log(group);
        throw new Error('ID conflict: duplicate ID found `' + id + '`.');
      }
      this.idsUsed.add(id);
      const timestamp = this.time(group[0]);
      if (id === null || id === undefined || /undefined/.test(id)) {
        throw new Error('Invalid ID ' + JSON.stringify(id) + ' generated for a group ' + JSON.stringify(group));
      }
      group.id = id + '';
      group.timestamp = timestamp;
    });
    return groups;
  }

  /**
   * Pre-process imported data object.
   */
  trimItem(obj) {
    return obj;
  }

  /**
   * Convert a source data group to transaction.
   * @param {Array<Object>} group
   * @param {Fyffe} fyffe
   * @return {Tx|null} Transaction or null, if type `skipped`.
   */
  createTransaction(group, fyffe) {

    this.stock = fyffe.stock;
    this.ledger = fyffe.ledger;

    // TODO: Cleanup. These can be figured from constructor data for each type.
    let obj = {};
    obj.id = this.id(group);
    obj.time = this.time(group[0]);
    obj.type = this.recognize(group);
    if (!obj.type) {
      throw new Error('Module ' + this.name + ' failed to recognize ' + JSON.stringify(group));
    }

    if (obj.type === 'skipped') {
      return null;
    }

    if (obj.type !== 'withdrawal' && obj.type !== 'deposit' && obj.type !== 'move-in' &&
      obj.type !== 'move-out' && obj.type !== 'trade' && obj.type !== 'expense' && obj.type !== 'income') {
      obj.currency = this.currency(group, obj);
      obj.rate = this.rate(group, obj);
    }
    if (obj.type !== 'withdrawal' && obj.type !== 'deposit' && obj.type !== 'interest') {
      obj.target = this.target(group, obj);
    }
    if (obj.type === 'trade') {
      obj.source = this.source(group, obj);
    }
    obj.total = this.total(group, obj, fyffe);
    if (obj.type !== 'interest' && obj.type !== 'dividend' && obj.type !== 'expense' && obj.type !== 'income') {
      obj.fee = this.fee(group, obj);
    }
    if (obj.type === 'dividend') {
      obj.tax = this.tax(group, obj);
    }
    if (obj.type === 'expense') {
      obj.vat = this.vat(group, obj);
    }
    if (obj.type === 'expense' || obj.type === 'income') {
      obj.notes = this.notes(group, obj);
    }
    if (obj.type === 'buy' || obj.type === 'sell' || obj.type === 'move-in' || obj.type === 'move-out' ||
      obj.type === 'dividend' || obj.type === 'trade') {
      obj.amount = this.amount(group, obj);
    }
    if (obj.type === 'trade' || obj.type === 'dividend') {
      obj.given = this.given(group, obj);
    }
    if (obj.type === 'trade' || obj.type === 'move-in' || obj.type === 'move-out' || obj.type === 'buy') {
      obj.burnAmount = this.burnAmount(group, obj);
      if (obj.burnAmount) {
        obj.burnTarget = this.burnTarget(group, obj);
      }
    }

    const type = obj.type;
    delete obj.type;
    let ret = Tx.create(type, obj, this.service, this.fund);
    this.tags(group, obj).forEach((tag) => {
      ret.tags.push(tag);
    });

    return ret;
  }
}

/**
 * Alternative base-class for import where loader processes data alrady to the correct format.
 */
class SinglePassImport extends Import {

  /**
   * Generate unique ID.
   */
  makeId(...parts) {
    let id = parts.join('-');
    let n = 1;
    while (this.ids.has(id)) {
      n++;
      id = parts.join('-') + '-' + n;
    }
    this.ids.add(id);
    return this.service + ':' + this.fund + ':' + id;
  }

  grouping(entries) {
    return entries.map(e => [e]);
  }

  id(group) {
    return group[0].id;
  }

  time(entry) {
    return entry.time ? new Date(entry.time).getTime() : new Date(entry.date).getTime();
  }

  recognize(group) {
    return group[0].type;
  }

  currency(group) {
    return group[0].currency;
  }

  rate(group) {
    return group[0].rate;
  }

  target(group) {
    return group[0].target;
  }

  total(group) {
    return group[0].total;
  }

  tax(group) {
    return group[0].tax;
  }

  amount(group) {
    return group[0].amount;
  }

  given(group) {
    return group[0].given;
  }

  fee(group) {
    return group[0].fee;
  }

  burnAmount(group) {
    return group[0].burnAmount || null;
  }
}

module.exports = Import;
module.exports.SinglePassImport = SinglePassImport;
