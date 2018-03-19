const fs = require('fs');
const path = require('path');
const clone = require('clone');
const objectMerge = require('object-merge');

// Storage for loaded ini-file.
let ini = {};

/**
 * Library configuration.
 */
class Config {

  constructor() {
    this.clear();
  }

  clear() {
    this.set({
      // Abbreviation of the primary currency.
      currency: 'EUR',
      // Language used in entry descriptions.
      language: 'fi',
      // Current service name.
      service: null,
      // Current fund name.
      fund: null,
      // Mapping from tags and their full names to tag objects.
      tags: {},
      // Various flags affecting library behavior.
      flags: {
        // If set, do not generate profit/loss entries for selling.
        noProfit: false,
        // If set, avoid doing permanent changes.
        dryRun: false,
        // If set, show verbose debug information.
        debug: false,
        // If set, force the operation.
        force: false
      },
      // Account numbers.
      accounts: {
        // Primary bank account.
        bank: null,
        // Currency accounts for trading.
        currencies: {
          eur: null,
          usd: null
        },
        // Accounts for holding tradeable targets.
        targets: {
          shares: null,
          eth: null,
          btc: null
        },
        // Tax accounts.
        taxes: {
          source: null,
          income: null
        },
        // Accounts for loaning currencies.
        loans: {
          eur: null
        },
        // All fees.
        fees: null,
        // Interests paid.
        interest: null,
        // Rounding errors.
        rounding: null,
        // Trade losses.
        losses: null,
        // Profits from the trades.
        profits: null,
        // Dividends paid.
        dividends: null
      }
    });
  }

  /**
   * Override variables from the given config.
   * @param {Object} config
   */
  set(config) {
    Object.assign(this, objectMerge(this, clone(config)));
  }

  /**
   * Collect non-null values and set them as the current.
   * @param {Object} config
   */
  setNonNull(config) {
    const strip = (obj) => {
      let ret = {};
      Object.keys(obj).forEach((key) => {
        if (obj[key] !== null) {
          if (obj[key] instanceof Object) {
            ret[key] = strip(obj[key]);
            if (Object.keys(ret[key]).length === 0) {
              delete ret[key];
            }
          } else {
            ret[key] = obj[key];
          }
        }
      });
      return ret;
    };
    this.set(strip(config));
  }

  /**
   * Collect defined account numbers.
   * @return {Object} A mapping from account numbers to configuration variable names.
   */
  getAllAccounts() {
    let ret = {};
    const collect = (accounts, prefix) => {
      Object.keys(accounts).forEach((acc) => {
        if (accounts[acc] === null) {
        } else if (typeof (accounts[acc]) === 'object') {
          collect(accounts[acc], acc + '.' + prefix);
        } else {
          ret[accounts[acc]] = prefix + acc;
        }
      });
    };
    collect(this.accounts, '');
    return ret;
  }

  /**
   * Look from ascending from the current directory until file `.fyffe` is found.
   *
   * @return {String|null}
   */
  iniPath() {
    let dir = process.cwd();
    while (true) {
      let file = path.join(dir, '.fyffe');
      if (fs.existsSync(file)) {
        return file;
      }
      if (dir === path.dirname(dir)) {
        return null;
      }
      dir = path.dirname(dir);
    }
  }

  /**
   * Load configuration file.
   * @param {String} path
   */
  loadIni(path = null) {
    if (!path) {
      path = this.iniPath();
    }
    if (path) {
      ini = JSON.parse(fs.readFileSync(path).toString('utf-8'));
      this.set(ini.default);
    }
  }

  /**
   * Use the named section of the config.
   * @param {String} section
   */
  use(section) {
    if (!ini[section]) {
      throw new Error('No such section in ' + this.iniPath() + ' than ' + JSON.stringify(section));
    }
    this.clear();
    this.set(ini.default);
    this.set(ini[section]);
  }
}

let config = new Config();
config.loadIni();

module.exports = config;
