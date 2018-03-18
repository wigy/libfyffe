const Accounts = require('./Accounts');
const Tx = require('../tx/Tx');
const num = require('../util/num');
const config = require('../config');
const d = require('neat-dump');

/**
 * A container for storing transactions.
 */
module.exports = class Stock {

  constructor() {
    this.txs = [];
    this.notApplied = new Set();
    this.accounts = new Accounts();
  }

  /**
   * Add one or more transactions to the ledger.
   * @param {Array<TX>|Tx} tx
   */
  add(tx) {
    if (tx instanceof Tx) {
      this.txs.push(tx);
      this.notApplied.add(tx);
    } else if (tx instanceof Array) {
      tx.forEach((t) => this.add(t));
    } else {
      throw new Error('Invalid transaction to add ' + JSON.stringify(tx));
    }
  }

  /**
   * Collect all different targets from the transactions.
   */
  getTargets() {
    let targets = this.txs.filter(tx => tx.has('target')).map(tx => tx.target);
    return [...new Set(targets)];
  }

  /**
   * Collect all different currencies from the transactions.
   */
  getCurrencies() {
    let targets = this.txs.filter(tx => tx.has('currency')).map(tx => tx.currency);
    return [...new Set(targets)];
  }

  /**
   * Apply all transactions not yet applied to the stock.
   * @param {Stock} stock
   */
  apply(stock) {
    this.notApplied.forEach((tx) => {
      tx.apply(this.accounts, stock);
    });
    this.notApplied.clear();
  }

  /**
   * Dump transactions loaded to the screen.
   * @param {String} title
   */
  showTransactions(title) {
    d.purple(title);
    this.txs.forEach((tx) => {
      d.green('  ', num.currency(tx.total, config.currency), tx.getText());
      tx.getEntries().forEach((entry) => {
        d.yellow('       ', entry.number, this.accounts.get(entry.number).name, num.currency(entry.amount, config.currency));
      });
    });
  }
};
