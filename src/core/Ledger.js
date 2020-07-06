const Accounts = require('./Accounts');
const Tx = require('../tx/Tx');
const num = require('../util/num');
const config = require('../config');
const dump = require('neat-dump');

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
    const targets = new Set(this.txs.filter(tx => tx.has('target')).map(tx => tx.getTarget()));
    this.txs.filter(tx => tx.has('source')).forEach(tx => targets.add(tx.getSource()));
    return [...targets];
  }

  /**
   * Collect all different currencies from the transactions.
   */
  getCurrencies() {
    const targets = this.txs.filter(tx => tx.has('currency')).map(tx => tx.currency);
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
   * @param {Object[]} extraTxs
   * Additional transactions can be given as an array of {number, amount, time}
   */
  apply(stock, extraTxs = []) {
    this.txs = this.txs.sort((a, b) => a.time - b.time);
    extraTxs = extraTxs.sort((a, b) => a.time - b.time);

    // Apply txs.
    const loans = {};
    let service, fund;
    let lastTime = 0;
    let extraIndex = 0;

    this.txs.forEach((tx) => {
      if (this.notApplied.has(tx)) {
        lastTime = Math.max(lastTime, tx.time);
        service = service || tx.service;
        fund = fund || tx.fund;
        // Apply other txs.
        while (extraIndex < extraTxs.length && tx.time >= extraTxs[extraIndex].time) {
          // console.log('Extra', new Date(extraTxs[extraIndex].time), extraTxs[extraIndex].number, extraTxs[extraIndex].amount);
          this.accounts.transfer(extraTxs[extraIndex].number, extraTxs[extraIndex].amount);
          extraIndex++;
        }
        tx.updateFromStock(stock);
        // console.log(tx);
        const result = tx.apply(this.accounts, stock);
        for (const r of result) {
          if (!loans[r.currency]) {
            loans[r.currency] = {};
          }
          loans[r.currency][r.account] = { loan: r.loan, tags: r.tags };
        }
        this.notApplied.delete(tx);
      }
    });

    // Create post processing txs.
    Object.entries(loans).forEach(([currency, specs]) => {
      Object.entries(specs).forEach(([acc, def]) => {
        const { loan, tags } = def;
        let loanTx;
        const accBalance = this.accounts.getBalance(acc);
        const loanBalance = this.accounts.getBalance(loan);

        const id = 'LOAN@' + lastTime + ':' + currency + ':' + acc + ':' + loan;
        if (accBalance < -0.001) {
          // Take more loan.
          loanTx = Tx.create('loan-take', { id, tags, currency, time: lastTime, total: num.cents(-accBalance) }, service, fund);
        } else if (loanBalance < -0.001 && accBalance > 0.001) {
          // Pay loan back.
          const payBack = Math.min(-loanBalance, accBalance);
          loanTx = Tx.create('loan-pay', { id, tags, currency, time: lastTime, total: num.cents(payBack) }, service, fund);
        }

        if (loanTx) {
          this.add(loanTx);
          this.apply(stock);
        }
      });
    });
  }

  /**
   * Dump transactions loaded to the screen.
   * @param {String} title
   */
  showTransactions(title) {
    dump.purple(title);
    this.txs.forEach((tx) => {
      dump.green('  ', tx.getTitle());
      tx.getEntries().forEach((entry) => {
        dump.yellow('       ', entry.number, this.accounts.get(entry.number).name, num.currency(entry.amount, config.currency), entry.description ? '  - ' + entry.description : '');
      });
    });
  }
};
