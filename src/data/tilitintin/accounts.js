
/**
 * Get account IDs matching the given numbers.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {Array<String>} numbers
 */
function getIdsByNumber(knex, numbers) {
  return knex.select('id', 'number')
    .from('account')
    .whereIn('number', numbers)
    .then((data) => {
      let ret = {};
      data.forEach((account) => (ret[account.number] = account.id));
      return ret;
    });
}

/**
 * Get all accounts.
 * @param {Knex} knex Knex-instance configured for the database.
 */
function getAll(knex) {
  return knex.select('*').from('account').orderBy('number');
}

/**
 * Get the balances for the given accounts.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {Array<String>} numbers
 */
function getBalances(knex, numbers) {
  // TODO: Find the last period and count it from there.
  return getIdsByNumber(knex, numbers)
    .then((idByNumber) => {
      return Promise.all(numbers.map((number) => {
        number = parseInt(number);
        return knex.select(knex.raw('SUM(debit * amount) + SUM((debit - 1) * amount) AS total, ' + number + ' as number'))
          .from('entry')
          .where({account_id: idByNumber[number]})
          .andWhere('description', '<>', 'Alkusaldo')
          .then((data) => data[0]);
      }))
        .then((data) => {
          let ret = {};
          data.forEach((res) => (ret[res.number] = res.total || 0));
          return ret;
        });
    });
}

module.exports = {
  getAll: getAll,
  getBalances: getBalances
};
