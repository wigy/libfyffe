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
        stopOnError: false,
        // If set, show converted currency values for entries with rate and currency set different from default.
        addCurrencies: false,
        // If set, add loan update only at the end of the import.
        singleLoanUpdate: false
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
          transfer6: null,
          transfer7: null,
          transfer8: null,
          transfer9: null,
          transfer10: null,
          transfer11: null,
          transfer12: null,
          transfer13: null,
          transfer14: null,
          transfer15: null,
          transfer16: null,
          transfer17: null,
          transfer18: null,
          transfer19: null,
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
          transfer5: null,
          transfer6: null,
          transfer7: null,
          transfer8: null,
          transfer9: null,
          transfer10: null,
          transfer11: null,
          transfer12: null,
          transfer13: null,
          transfer14: null,
          transfer15: null,
          transfer16: null,
          transfer17: null,
          transfer18: null,
          transfer19: null
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
        // Fund specific overrides.
        funds: {
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
      if (this.services[service].funds) {
        Object.keys(this.services[service].funds).forEach((fund) => {
          collect(this.services[service].funds[fund].accounts, service + '.' + fund);
        });
      }
    });
    return ret;
  }

  /**
   * Find the configuration variable value from service/fund or from defaults.
   * @param {String} name
   * @param {String} [service]
   * @param {String} [fund]
   * @return {null|String}
   */
  get(name, service = null, fund = null) {
    let vars;
    if (service === null) {
      vars = this;
    } else if (fund === null) {
      vars = this.services[service] || {};
    } else {
      if (!this.services[service] || !this.services[service].funds) {
        vars = {};
      } else {
        vars = this.services[service].funds[fund] || {};
      }
    }

    let ret = null;
    name.split('.').forEach((part) => {
      if (vars) {
        ret = vars[part] || null;
        vars = vars[part];
      }
    });

    if (ret === null && fund !== null) {
      return this.get(name, service);
    }
    if (ret === null && service !== null) {
      return this.get(name);
    }

    return ret;
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
