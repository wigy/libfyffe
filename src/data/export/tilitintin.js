const d = require('neat-dump');
const promiseSeq = require('promise-sequential');
const Export = require('../export');
const tilitintinTx = require('../tilitintin/tx');
const imports = require('../tilitintin/imports');
const config = require('../../config');

class TilitintinExport extends Export {

  constructor() {
    super('Tilitintin');
  }

  async save(knex, tx) {
    const serviceTag = config.getTag(config.getServiceName(tx.service));
    const tag = serviceTag ? serviceTag.tag : '<' + tx.service + '>';
    return tilitintinTx.add(knex, tx.date, tx.getText(), tx.getEntries(), {force: true})
      .then((docId) => imports.add(knex, tag, tx.id, docId))
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
