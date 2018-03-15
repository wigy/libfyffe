const clone = require('clone');

/**
 * Library configuration.
 */
class Config {
  set(config) {
    Object.assign(this, clone(config));
  }
}

let config = new Config();

config.set({
  // Abbreviation of the primary currency.
  currency: 'EUR',
  // Language used in entry descriptions.
  language: 'fi',
  // Current service name.
  service: null,
  // Current fund name.
  fund: null,
  // Various flags affecting library behavior.
  flags: {
    // If set, do not generate profit/loss entries for selling.
    noProfit: false,
    // If set, avoid doing permanent changes.
    dryRun: false,
    // If set, show verbose debug information.
    debug: false
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

module.exports = config;
