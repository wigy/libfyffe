/**
 * Convert account number to ID.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {number} number Account number.
 * @return An object {id: <id>, number: <number>} or null if not found.
 */
async function getAccountId(knex, number) {
  return knex.select('id').from('account')
    .where({'account.number': number})
    .then(account => (account.length ? {number: number, id: account[0].id} : null));
}

/**
 * Get account IDs matching the given numbers.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {Array<String>} numbers
 */
async function getIdsByNumber(knex, numbers) {
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
async function getAll(knex) {
  return knex.select('*').from('account').orderBy('number');
}

/**
 * Get the period ID for the given timestamp.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {Number} stamp
 * @return {Promise<Number|null>}
 */
async function getPeriod(knex, stamp) {
  return knex.select('id').from('period')
    .where('start_date', '<=', stamp)
    .andWhere('end_date', '>', stamp)
    .then((res) => res && res.length ? res[0].id : null);
}

/**
 * Get the balances for the given accounts.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {Array<String>} numbers
 * @param {String} date If given as `YYYY-MM-DD`, calculate balance before the given date.
 */
async function getBalances(knex, numbers, date = null) {
  const stamp = date === null ? new Date().getTime() + 1000 : new Date(date + ' 00:00:00').getTime();
  let periodId;
  return getPeriod(knex, stamp)
    .then((id) => {
      periodId = id;
      if (!periodId) {
        return {};
      }
      return getIdsByNumber(knex, numbers);
    })
    .then((idByNumber) => {
      return Promise.all(numbers.map((number) => {
        number = parseInt(number);
        return knex.select(knex.raw('SUM(debit * amount) + SUM((debit - 1) * amount) AS total, ' + number + ' as number'))
          .from('entry')
          .join('document', 'document.id', '=', 'entry.document_id')
          .where({account_id: idByNumber[number]})
          .andWhere('document.period_id', '=', periodId)
          .andWhere('document.date', '<', stamp)
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
  getAccountId: getAccountId,
  getBalances: getBalances
};
