const fs = require('fs');
const path = require('path');
const clone = require('clone');
const objectMerge = require('object-merge');

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
      // Name of the loan provided in this service.
      loanName: null,
      // Mapping from tags and their full names to tag objects.
      tags: {},
      // Various flags affecting library behavior.
      flags: {
        // If set, do not generate profit/loss entries for selling.
        noProfit: false,
        // If set, generate immediate profit/loss entries for trading using the closing price of the target.
        tradeProfit: false,
        // If set, avoid doing permanent changes.
        dryRun: false,
        // If set, show verbose debug information.
        debug: false,
        // If set, do not add to stock commodities received with `move-in`.
        zeroMoves: false,
        // If set, force the operation.
        force: false,
        // If import fails, just print and skip the failed transaction.
        skipErrors: false,
        // If import fails, create move transaction to imbalance account
        importErrors: false,
        // If import fails, stop there but continue with successful entries before that.
        stopOnError: false
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
          income: null,
          vat: null
        },
        // Accounts for loaning currencies.
        loans: {
          eur: null
        },
        // Accounts for target expenses.
        expenses: {
          'gov-fees': null,
          bank: null,
          misc: null,
          misc1: null,
          misc2: null,
          misc3: null,
          misc4: null,
          misc5: null,
          computer: null,
          software: null,
          transfer: null,
          transfer2: null,
          transfer3: null,
          transfer4: null,
          transfer5: null,
          vat: null
        },
        // Accounts for target incomes.
        incomes: {
          invest: null,
          invest2: null,
          misc: null,
          misc1: null,
          misc2: null,
          misc3: null,
          misc4: null,
          misc5: null,
          sales: null,
          sales2: null,
          sales3: null,
          sales4: null,
          sales5: null,
          transfer: null,
          transfer2: null,
          transfer3: null,
          transfer4: null,
          transfer5: null
        },
        // Transaction fees.
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
        dividends: null
      },
      // Service specific overrides.
      services: {
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
   * Collect defined account numbers.
   * @return {Object} A mapping from account numbers to configuration variable names.
   */
  getAllAccounts() {
    let ret = {};
    const collect = (accounts, prefix) => {
      if (!accounts) {
        return;
      }
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
    Object.keys(this.services).forEach((service) => {
      collect(this.services[service].accounts, service);
    });
    return ret;
  }

  /**
   * Find the configuration variable value from service or from defaults.
   * @param {String} name
   * @param {String} service
   * @return {null|String}
   */
  get(name, service = null) {
    let vars;
    if (service === null) {
      vars = this;
    } else {
      vars = this.services[service] || {};
    }

    let ret = null;
    name.split('.').forEach((part) => {
      if (vars) {
        ret = vars[part] || null;
        vars = vars[part];
      }
    });

    if (ret === null && service !== null) {
      return this.get(name);
    }

    return ret;
  }

  /**
   * Get the full name of the service.
   * @param {String} service
   */
  getServiceName(service) {
    if (this.services[service]) {
      return this.services[service].service || null;
    }
    return null;
  }

  /**
   * Get the name of the fund.
   * @param {String} service
   */
  getFundName(service) {
    if (this.services[service]) {
      return this.services[service].fund || null;
    }
    return null;
  }

  /**
   * Lookup for tag.
   * @param {String} name
   */
  getTag(name) {
    const tags = this.get('tags');
    return tags[name] || null;
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
      const ini = JSON.parse(fs.readFileSync(path).toString('utf-8'));
      this.set(ini);
    }
  }
}

let config = new Config();

module.exports = config;
