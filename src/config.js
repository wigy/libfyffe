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
    Object.assign(this, {
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
          default: null,
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
        // Account to collect invalid balances.
        imbalance: null,
        // Trade losses.
        losses: null,
        // Profits from the trades.
        profits: null,
        // Dividends paid.
        dividends: null,
        // Service specific accounts as per service overriding defaults.
        service: {
        }
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
   * Override defaults and set them as current as well.
   * @param {Object} config
   */
  setDefaults(config) {
    console.log('Call to obsolete setDefaults().');
    this.set(config);
    Object.assign(ini.default, objectMerge(ini.default, clone(config)));
  }

  /**
   * Collect defined account numbers.
   * @return {Object} A mapping from account numbers to configuration variable names.
   */
  getAllAccounts() {
    let ret = {};
    const collect = (accounts, prefix) => {
      Object.keys(accounts).forEach((acc) => {
        const name = (prefix ? prefix + '.' : '') + acc;
        if (accounts[acc] === null) {
        } else if (typeof (accounts[acc]) === 'object') {
          collect(accounts[acc], name);
        } else {
          ret[accounts[acc]] = name;
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
    // TODO: This is obsolete. Replaced with service-specific accounts.
    console.log('Call to obsolete use().');
    if (!ini[section]) {
      throw new Error('No such section in ' + this.iniPath() + ' than ' + JSON.stringify(section));
    }
    // Save tags.
    const tags = clone(this.tags);
    this.clear();
    this.set(clone(ini.default));
    this.set(clone(ini[section]));
    this.tags = tags;
  }
}

let config = new Config();
config.loadIni();

module.exports = config;
