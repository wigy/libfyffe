const Accounts = require('./Accounts');
const Tx = require('../tx/Tx');
const num = require('../util/num');
const config = require('../config');
const d = require('neat-dump');

/**
 * A container for storing transactions.
 */
module.exports = class Ledger {

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
    let targets = new Set(this.txs.filter(tx => tx.has('target')).map(tx => tx.getTarget()));
    this.txs.filter(tx => tx.has('source')).forEach(tx => targets.add(tx.getSource()));
    return [...targets];
  }

  /**
   * Collect all different currencies from the transactions.
   */
  getCurrencies() {
    let targets = this.txs.filter(tx => tx.has('currency')).map(tx => tx.currency);
    return [...new Set(targets)];
  }

  /**
   * Get all transactions in this ledger.
   */
  getTransactions() {
    return this.txs;
  }

  /**
   * Apply all transactions in timestamp order not yet applied to the stock.
   * @param {Stock} stock
   */
  apply(stock) {
    this.txs = this.txs.sort((a, b) => a.time - b.time);

    this.txs.forEach((tx) => {
      if (this.notApplied.has(tx)) {
        tx.updateFromStock(stock);
        tx.apply(this.accounts, stock);
        this.notApplied.delete(tx);
      }
    });
  }

  /**
   * Dump transactions loaded to the screen.
   * @param {String} title
   */
  showTransactions(title) {
    d.purple(title);
    this.txs.forEach((tx) => {
      d.green('  ', tx.date, num.currency(tx.total, config.currency), tx.getText());
      tx.getEntries().forEach((entry) => {
        d.yellow('       ', entry.number, this.accounts.get(entry.number).name, num.currency(entry.amount, config.currency), entry.description ? '  - ' + entry.description : '');
      });
    });
  }
};
