const clone = require('clone');
const config = require('../config');

// If set, use internal tables instead of database.
const TEST_MODE = false;

// Storage for test mode running IDs.
const TABLE_ID = {
};
// Storage for test mode data.
const STORE = {
};

/**
 * Find out the account number based on its fyffe config key.
 * @param {String} code
 * @param {String} [service]
 * @returns {String}
 */
function getAccountNumber(code, service = null) {
  const number = config.get(code, service);
  if (!number) {
    throw new Error(`Cannot find configuration for account '${code}' for ${service || 'default'}-service.`);
  }
  return number;
}

/**
 * Insert new entry to the given table.
 * @param {Knex} knex
 * @param {String} table
 * @param {Object} data
 */
async function add(knex, table, data) {
  if (TEST_MODE) {
    const id = (TABLE_ID[table] || 0) + 1;
    TABLE_ID[table] = id;
    STORE[table] = STORE[table] || {};
    STORE[table][id] = clone(data);
    STORE[table][id].id = id;
    console.log(table, '#', id);
    console.log(JSON.stringify(data, null, 2));
    return id;
  }
  return (await knex(table).insert(data))[0];
}

/**
 * Find the entry from the table having the given values in keys.
 * @param {Knex} knex
 * @param {String} table
 * @param {Object} keyValues
 */
async function find(knex, table, keyValues) {
  if (TEST_MODE) {
    if (!STORE[table]) {
      return null;
    }
    for (const item of Object.values(STORE[table])) {
      let different = false;
      for (const [k, v] of Object.entries(keyValues)) {
        if (item[k] !== v) {
          different = true;
          break;
        }
      }
      if (!different) {
        return item;
      }
    }
    return null;
  }
  return knex(table).where(keyValues).first();
}

/**
 * Conditionally add an entry to the table if it does not have matching keys already.
 * @param {Knex} knex
 * @param {String} table
 * @param {Object} data
 * @param  {String[]} keys
 */
async function addIf(knex, table, data, ...keys) {
  const lookup = keys.reduce((prev, cur) => ({...prev, [cur]: data[cur]}), {});
  const old = await find(knex, table, lookup);
  if (old) {
    return old.id;
  }
  return add(knex, table, data);
}

/**
 * Create an account if it does not exist.
 * @param {Knex} knex
 */
async function addAccount(knex, { fund, service, account: { name, number } }) {
  const fundId = await addIf(knex, 'funds', {name: fund.name, tag: fund.tag}, 'name');
  const serviceId = await addIf(knex, 'services', {name: service.name, tag: service.tag}, 'name');
  return addIf(knex, 'accounts', {serviceId, fundId, number, name}, 'number', 'fundId', 'serviceId');
}

/**
 * Create new shares for the investor to the given fund.
 * @param {Knex} knex
 */
async function addShares(knex, { date, amount, transferId, fundId, investorId }) {
  return add(knex, 'shares', { date, amount, transferId, fundId, investorId });
}

/**
 * Create a comment entry.
 * @param {Knex} knex
 * @param {Object} data
 */
async function addComment(knex, data) {
  return add(knex, 'comments', { data: JSON.stringify(data) });
}

/**
 * Create transfer from one account to another.
 * @param {Knex} knex
 */
async function addTransfer(knex, { date, fromId = null, toId = null, amount, commentId }) {
  if (fromId) {
    fromId = await add(knex, 'value_changes', {accountId: fromId, date, amount: -amount, commentId});
  }
  if (toId) {
    toId = await add(knex, 'value_changes', {accountId: toId, date, amount, commentId});
  }
  return add(knex, 'transfers', {fromId, toId, commentId});
}

/**
 * Add money to cash account and create equal amount of shares to the cash fund for the investor.
 * @param {Knex} knex
 */
async function addDeposit(knex, { investorId, date, amount, comment = {} }) {
  const fundId = (await find(knex, 'funds', {name: 'Cash'})).id;
  const account = await find(knex, 'accounts', {number: getAccountNumber('accounts.bank')});
  const investor = await find(knex, 'investors', {id: investorId});
  const commentId = await addComment(knex, {
    type: 'deposit',
    investor: { id: investor.id, email: investor.email, name: investor.name },
    ...comment
  });
  const transferId = await addTransfer(knex, {date, toId: account.id, amount, commentId});
  await addShares(knex, { date, amount, transferId, fundId, investorId });
}

/**
 * Remove money from cash account and reduce equal amount of shares from the cash fund for the investor.
 * @param {Knex} knex
 */
async function addWithdrawal(knex, { investorId, date, amount, comment = {} }) {
  const fundId = (await find(knex, 'funds', {name: 'Cash'})).id;
  const accountId = (await find(knex, 'accounts', {number: getAccountNumber('accounts.bank')})).id;
  const investor = await find(knex, 'investors', {id: investorId});
  const commentId = await addComment(knex, {
    type: 'withdrawal',
    investor: { id: investor.id, email: investor.email, name: investor.name },
    ...comment
  });
  const transferId = await addTransfer(knex, {date, fromId: accountId, amount, commentId});
  await addShares(knex, { date, amount: -amount, transferId, fundId, investorId });
}

module.exports = {
  add,
  addIf,
  addAccount,
  addComment,
  addDeposit,
  addShares,
  addTransfer,
  addWithdrawal,
  find
};
