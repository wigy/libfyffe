const Tx = require('../tx/Tx');

/**
 * A container for storing transactions.
 */
module.exports = class Stock {

  constructor() {
    this.txs = [];
  }

  /**
   * Add one or more transactions to the ledger.
   * @param {Array<TX>|Tx} tx
   */
  add(tx) {
    if (tx instanceof Tx) {
      this.txs.push(tx);
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
};
