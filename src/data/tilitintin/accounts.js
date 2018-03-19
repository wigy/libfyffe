/**
 * Get all accounts.
 * @param {Knex} knex Knex-instance configured for the database.
 */
function getAll(knex) {
  return knex.select('*').from('account').orderBy('number');
}

module.exports = {
  getAll: getAll
};
