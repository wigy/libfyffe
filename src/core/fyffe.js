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
  }

  import() {
    // TODO: Mechanism to fill in data from external source.
  }

  export() {
    // TODO: Mechanism to transfer data to external sink.
  }
}

module.exports = new Fyffe();
