/**
 * Check if import bookkeeping table is available.
 * @param {Knex} knex Knex-instance configured for the database.
 * @return {Promise<boolean>}
 */
function isImportReady(knex) {
  return knex.schema.hasTable('imports');
}

/**
 * Make sure that table for import bookkeeping exists.
 * @param {Knex} knex Knex-instance configured for the database.
 * @return {Promise<true>}
 */
function ensureImport(knex) {
  return isImportReady(knex)
    .then((yes) => {
      if (yes) {
        return Promise.resolve(true);
      }
      return knex.schema.createTable('imports', function (table) {
        table.increments('id').primary();
        table.string('service_tag', 16).notNullable();
        table.string('tx_id', 256).notNullable();
        table.integer('document_id').nullable();

        table.unique(['service_tag', 'tx_id']);
        table.index('document_id');
      })
        .then(() => true);
    });
}

/**
 * Insert an import mark.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {string} serviceTag
 * @param {string} txId
 * @param {string} docId
 * @return {Promise}
 */
function addImport(knex, serviceTag, txId, docId) {
  if (!docId) {
    throw new Error('No document ID given, when marking imported transaction ' + txId + ' for ' + serviceTag + ' (tx exists?)');
  }
  return ensureImport(knex)
    .then(() => {
      return knex('imports').insert({
        service_tag: serviceTag,
        tx_id: txId,
        document_id: docId
      });
    });
}

/**
 * Check if an entry is imported.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {string} serviceTag
 * @param {string} txId
 * @return {Promise<Boolean>}
 */
function hasImport(knex, serviceTag, txId) {
  return isImportReady(knex)
    .then((yes) => {
      if (yes) {
        return knex('imports').where({
          service_tag: serviceTag,
          tx_id: txId
        });
      }
      return false;
    })
    .then((matches) => matches && matches.length > 0);
}

module.exports = {
  isReady: isImportReady,
  ensure: ensureImport,
  add: addImport,
  has: hasImport
};
