const fs = require('fs');
const dump = require('neat-dump');
const readline = require('readline');
const safeEval = require('safe-eval');
const Tx = require('../../tx/Tx');
const StringMapper = require('../../text/StringMapper');
const config = require('../../config');
const csv = require('../csv');

/**
 * Base class for importing data.
 */
class Import {

  constructor(name) {
    this.config = config;
    this.name = name;
    this.service = null;
    this.fund = null;
    this.mapper = null;
    // Initialized when creating transactions.
    this.stock = null;
    this.ledger = null;
    this.idsUsed = new Set();
    this.ids = new Set();

    this.questions = {};
    this.maps = {};
    this.answers = null;
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
    this.questions = this.config.get('import.questions', this.service, this.fund);
    this.maps = this.config.get('import.maps', this.service, this.fund);
  }

  /**
   * A mapping of module names to module instances.
   * @return {Map}
   */
  static modules() {
    const ret = new Map();
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
    const USE_OLD = false;
    if (USE_OLD) {
      // TODO: Remove once library is reliable.
      const csvtojson = require('csvtojson');
      return new Promise((resolve, reject) => {

        let headers = null;
        opts.noheader = true;

        const lines = [];

        csvtojson(opts)
          .fromString(file)
          .on('csv', (row) => {
            if (opts.cutFromBeginning) {
              opts.cutFromBeginning--;
            } else if (headers === null) {
              headers = opts.headers || row.map(r => r.replace(/\W/g, '_'));
              headers = headers.map((header, i) => header || 'Column' + (i + 1));
            } else {
              const line = {};
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
    } else {
      return csv.readString(file, { lineNumbers: true, ...opts });
    }
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
   * Parse raw transaction value used as backup on failed import or simplified import.
   *
   * @param {Array<Object>} group A source data group.
   * @return {Number}
   */
  rawValue(group) {
    throw new Error('Importer does not implement rawValue().');
  }

  /**
   * Parse raw transaction text used on failed import.
   *
   * @param {Array<Object>} group A source data group.
   * @return {Number}
   */
  rawText(group) {
    throw new Error('Importer does not implement rawText().');
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
    id += group.map((g) => g.__lineNumber).sort((a, b) => a - b).join(',');
    return id;
  }

  /**
   * Split input data to groups and generate IDs and timestamps.
   * @param {Array<any>} entries
   * @return {Promise<Array<Array<any>>>}
   */
  makeGrouping(entries) {
    const groups = this.grouping(entries);
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
   * Use the string mapper to find data for the group.
   * @param {Array} group
   * @param {String} [field]
   * @param {any} [def]
   * @return {Object}
   */
  useMapper(group, obj, field, def = undefined) {
    if (group.length > 1) {
      throw new Error('String mapper cannot handle yet more than one item in the group.');
    }
    const name = this.mapper.findMatch('recognize', group[0]);
    if (!name) {
      throw new Error('Unable to find a match with string mapper: ' + JSON.stringify(group));
    }
    const rule = this.mapper.get('recognize', name);
    let data;
    if ('=>' in rule) {
      data = rule['=>'];
      for (const key of Object.keys(data)) {
        // Handle questions.
        if (key.endsWith('?')) {
          const qkey = data[key];
          delete data[key];
          if (!this.questions[qkey]) {
            throw new Error(`Cannot find definitions for import questions '${qkey}' for key '${key}'.`);
          }
          const key0 = key.substr(0, key.length - 1);
          data[key0] = this.questions[qkey];
        }
      }
    } else {
      // TODO: This way of doing the mapping is pointless. Can be dropped when not in use.
      dump.red(`Obsolete use of 'txs' string mapper for '${name}'. Please switch to '=>' notation.`);
      data = this.mapper.get('txs', name);
    }

    if (!(field in data)) {
      if (def === undefined) {
        const name = this.mapper.findMatch('recognize', group[0]);
        throw new Error('A field `' + field + '` is not configured for `' + name + '` in ' + JSON.stringify(data));
      }
      return def;
    }
    let ret = data[field];
    if (typeof ret === 'string' && ret.substr(0, 2) === '${' && ret.substr(-1, 1) === '}') {
      ret = safeEval(ret.substr(2, ret.length - 3), {
        stock: (code) => this.stock.getStock(code),
        total: obj ? obj.total : null
      });
      if (typeof ret !== 'string' && (isNaN(ret) || ret === Infinity)) {
        throw Error('Invalid result NaN or Infinity from expression `' + data[field] + '`.');
      }
    }
    return ret;
  }

  async readLine() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise((resolve) => {
      rl.question('Select one? ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async loadQuestionCache() {
    if (await fs.existsSync(config.path + '-cache')) {
      dump.info(`Loading cache ${config.path + '-cache'}`);
      return JSON.parse(fs.readFileSync(config.path + '-cache').toString('UTF-8'));
    }
    return {};
  }

  async saveQuestionCache(data) {
    dump.info(`Saving cache ${config.path + '-cache'}`);
    fs.writeFileSync(config.path + '-cache', JSON.stringify(data, null, 4), 'UTF-8');
  }

  async handleQuestions(field, group, obj, q) {
    if (this.answers === null) {
      this.answers = await this.loadQuestionCache();
    }
    if (!(q instanceof Array) && q instanceof Object) {
      if (!obj.id) {
        throw Error('Cannot handle questions for objects without ID.');
      }
      if (!this.answers[obj.id]) {
        this.answers[obj.id] = {};
      }
      if (this.answers[obj.id][field]) {
        return this.answers[obj.id][field];
      }
      console.log('---------------------------------------------------------------------------');
      console.log(group);
      console.log('---------------------------------------------------------------------------');
      dump.orange(`Select ${field}:`);
      const map = {};
      let n = 1;
      Object.entries(q).forEach(([k, v]) => {
        dump.cyan(`  ${n}: ${k} (${v})`);
        map[n] = v;
        n++;
      });
      const ans = await this.readLine();
      this.answers[obj.id][field] = map[ans];
      await this.saveQuestionCache(this.answers);
      return map[ans];
    }
    return q;
  }

  /**
   * Process automatic field mappings.
   * @param {Array<Object>} group
   * @param {Object} obj
   * @return {Set<String>}
   */
  processMappings(group, obj) {
    const ret = new Set();
    const name = this.mapper.findMatch('recognize', group[0]);
    if (!name) {
      return ret;
    }
    const rule = this.mapper.get('recognize', name);
    if ('=>' in rule) {
      const data = rule['=>'];
      for (const key of Object.keys(data)) {
        // Handle questions.
        if (key.endsWith('@')) {
          const qkey = data[key];
          if (!this.maps || !this.maps[qkey]) {
            throw new Error(`Cannot find definitions for import mappings '${qkey}' for key '${key}'.`);
          }
          for (const k of Object.keys(this.maps[qkey])) {
            if (obj[k] !== undefined) {
              for (const [k0, v0] of Object.entries(this.maps[qkey][k])) {
                if (k0 === obj[k]) {
                  const objKey = key.substr(0, key.length - 1);
                  obj[objKey] = v0;
                  ret.add(objKey);
                  break;
                }
              }
            }
          }
        }
      }
    }
    return ret;
  }

  /**
   * Convert a source data group to transaction.
   * @param {Array<Object>} group
   * @param {Fyffe} fyffe
   * @return {Tx|null} Transaction or null, if type `skipped`.
   */
  async createTransaction(group, fyffe) {

    this.stock = fyffe.stock;
    this.ledger = fyffe.ledger;

    // TODO: Cleanup. These can be figured from constructor data for each type.
    const obj = {};
    obj.id = this.id(group);
    obj.time = this.time(group[0]);
    obj.type = await this.handleQuestions('type', group, obj, this.recognize(group));
    if (!obj.type) {
      throw new Error('Module ' + this.name + ' failed to recognize ' + JSON.stringify(group));
    }

    if (obj.type === 'skipped') {
      return 'skipped';
    }

    if (obj.type !== 'withdrawal' && obj.type !== 'deposit' && obj.type !== 'move-in' &&
      obj.type !== 'move-out' && obj.type !== 'trade') {
      obj.currency = await this.handleQuestions('currency', group, obj, this.currency(group, obj));
      obj.rate = await this.handleQuestions('rate', group, obj, this.rate(group, obj));
    }
    if (obj.type !== 'withdrawal' && obj.type !== 'deposit' && obj.type !== 'interest') {
      obj.target = await this.handleQuestions('target', group, obj, this.target(group, obj));
    }
    if (obj.type === 'trade' || obj.type === 'stock-dividend') {
      obj.source = await this.handleQuestions('source', group, obj, this.source(group, obj));
    }
    obj.total = this.total(group, obj, fyffe);
    if (obj.type !== 'interest' && obj.type !== 'dividend' && obj.type !== 'stock-dividend' && obj.type !== 'expense' && obj.type !== 'income') {
      obj.fee = await this.handleQuestions('fee', group, obj, this.fee(group, obj));
    }
    if (obj.type === 'dividend') {
      obj.tax = await this.handleQuestions('tax', group, obj, this.tax(group, obj));
    }
    if (obj.type === 'expense') {
      obj.vat = await this.handleQuestions('vat', group, obj, this.vat(group, obj));
    }
    if (obj.type === 'expense' || obj.type === 'income' || obj.type === 'sell' || obj.type === 'trade') {
      obj.notes = await this.handleQuestions('notes', group, obj, this.notes(group, obj));
    }
    if (obj.type === 'buy' || obj.type === 'sell' || obj.type === 'move-in' || obj.type === 'move-out' ||
      obj.type === 'dividend' || obj.type === 'stock-dividend' || obj.type === 'trade') {
      obj.amount = await this.handleQuestions('amount', group, obj, this.amount(group, obj));
    }
    if (obj.type === 'trade' || obj.type === 'dividend' || obj.type === 'stock_dividend') {
      obj.given = await this.handleQuestions('given', group, obj, this.given(group, obj));
    }
    if (obj.type === 'trade' || obj.type === 'move-in' || obj.type === 'move-out' || obj.type === 'buy') {
      obj.burnAmount = await this.handleQuestions('burnAmount', group, obj, this.burnAmount(group, obj));
      if (obj.burnAmount) {
        obj.burnTarget = await this.handleQuestions('burnTarget', group, obj, this.burnTarget(group, obj));
      }
    }
    let tags = await this.handleQuestions('tags', group, obj, this.tags(group, obj));

    const modified = this.processMappings(group, obj);
    if (modified.has('tags')) {
      tags = obj.tags;
      delete obj.tags;
    }
    if (typeof tags === 'string') {
      if (!/\[.+\]/.test(tags)) {
        throw new Error('Invalid tags ' + JSON.stringify(tags));
      }
      tags = tags.substr(1, tags.length - 2).split('][');
    }

    const type = obj.type;
    delete obj.type;
    const ret = Tx.create(type, obj, this.service, this.fund);

    if (tags) {
      tags.forEach((tag) => {
        ret.tags.push(tag);
      });
    }

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

  source(group) {
    return group[0].source;
  }

  burnAmount(group) {
    return group[0].burnAmount || null;
  }

  burnTarget(group) {
    return group[0].burnTarget || null;
  }

  notes(group) {
    return group[0].notes || '';
  }
}

module.exports = Import;
module.exports.SinglePassImport = SinglePassImport;
