const d = require('neat-dump');
const promiseSeq = require('promise-sequential');
const Export = require('../export');
const tilitintinTx = require('../tilitintin/tx');

class TilitintinExport extends Export {

  constructor() {
    super('Tilitintin');
  }

  async save(knex, tx) {
    return tilitintinTx.add(knex, tx.date, tx.getText(), tx.getEntries(), {force: true})
    // TODO: Add meta data.
//      .then((docId) => meta.imports.add(this.db, this.config.service, txo.src.id, docId))
      .catch((err) => {
        d.error(err);
      });
  }

  async export(knex, options) {
    const {ledger} = options;
    const creators = ledger.getTransactions().map((tx) => () => this.save(knex, tx));
    return promiseSeq(creators);
  }
}

module.exports = new TilitintinExport();
