const Stock = require('./Stock');
const Accounts = require('./Accounts');
const Ledger = require('./Ledger');

/**
 * A system instance for transforming and inspecting financial data.
 */
class Fyffe {

  constructor() {
    this.stock = new Stock();
    this.accounts = new Accounts();
    this.ledger = new Ledger();
    this.dbs = {};
  }

  /**
   * Initialize a named DB instance.
   * @param {String} dbName Name of the database.
   * @param {Knex} knex Knex-instance configured for the database.
   */
  setDb(dbName, knex) {
    this.dbs[dbName] = knex;
  }

  async loadBalances(dbName) {
    // TODO: Mechnism to load balances.
  }

  async import(format, files) {
    console.log(format, files);
    // TODO: Mechanism to fill in data from external source.
  }

  async export() {
    // TODO: Mechanism to transfer data to external sink.
  }
}

module.exports = new Fyffe();
