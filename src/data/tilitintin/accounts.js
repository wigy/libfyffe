const moment = require('moment');

/**
 * Convert account number to ID.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {number} number Account number.
 * @return An object {id: <id>, number: <number>} or null if not found.
 */
async function getAccountId(knex, number) {
  return knex.select('id').from('account')
    .where({ 'account.number': number })
    .then(account => (account.length ? { number: number, id: account[0].id } : null));
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
      const ret = {};
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
 * @param String} date
 * @return {Promise<Number|null>}
 */
async function getPeriod(knex, date) {
  return knex.select('id').from('period')
    .where('start_date', '<=', date)
    .andWhere('end_date', '>', date)
    .then((res) => res && res.length ? res[0].id : null);
}

/**
 * Get the balances for the given accounts.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {Array<String>} numbers
 * @param {String} date If given as `YYYY-MM-DD`, calculate balance before the given date.
 * @return {[Object, Object[]]} Balance mapping and a list of transactions after the date.
 */
async function getBalances(knex, numbers, date = null) {
  if (!date) date = moment().format('YYYY-MM-DD');
  if (/sqlite/.test(knex.client.config.client)) {
    date = new Date(date + ' 00:00:00').getTime();
  }
  const periodId = await getPeriod(knex, date);
  let idByNumber;
  if (!periodId) {
    throw new Error(`Cannot find period for date ${date}.`);
  } else {
    idByNumber = await getIdsByNumber(knex, numbers);
  }
  return Promise.all(numbers.map((number) => {
    number = parseInt(number);
    return knex.select(knex.raw('SUM(CASE WHEN debit THEN amount ELSE -amount END) AS total, ' + number + ' as number'))
      .from('entry')
      .join('document', 'document.id', '=', 'entry.document_id')
      .where({ account_id: idByNumber[number] || 0 })
      .andWhere('document.period_id', '=', periodId)
      .andWhere('document.date', '<', date)
      .then((data) => data[0]);
  }))
    .then((data) => {
      const ret = {};
      data.forEach((res) => (ret[res.number] = res.total || 0));
      return ret;
    })
    .then(async (ret) => {
      const missing = numbers.map(n => [n, idByNumber[n]]).filter(pair => pair[1] === undefined).map(pair => pair[0]);
      if (missing.length) {
        throw new Error(`Configured accounts ${missing.join(' ')} do not exist.`);
      }
      const txs = await knex.select(knex.raw('account_id, (CASE WHEN debit THEN amount ELSE -amount END) AS amount, document.date'))
        .from('entry')
        .join('document', 'document.id', '=', 'entry.document_id')
        .whereIn('account_id', numbers.map(n => idByNumber[n]))
        .andWhere('document.period_id', '=', periodId)
        .andWhere('document.date', '>=', date)
        .orderBy('document.date');

      const numberById = {};
      Object.entries(idByNumber).forEach(([k, v]) => (numberById[v] = k));
      return [ret, txs.map(tx => ({ time: tx.date, amount: tx.amount, number: numberById[tx.account_id] }))];
    });
}

module.exports = {
  getAll: getAll,
  getAccountId: getAccountId,
  getBalances: getBalances
};
