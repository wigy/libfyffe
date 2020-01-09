const dump = require('neat-dump');
const Parser = require('../../text/Parser');
const { dateFromDb } = require('./utils');
const moment = require('moment');

/**
 * Scan for the latest average price and stock for the given targets.
 * @param {*} knex
 * @param {String} date
 * @param {Set<String>} targets
 * @return {Promise<Object>}
 *
 * The format of the returned object is
 * ```
 * {
 *   "stock": {
 *     "TG1": 12.0005,
 *     "TG2": 0.005
 *   },
 *   "avg": {
 *     "TG1": 0.11,
 *     "TG2": 511212.11
 *   },
 * }
 * ```
 */
function findPriceAndStock(knex, date = null, targets = null) {
  const parser = new Parser();
  const missingAvg = new Set(targets);
  const missingStock = new Set(targets);
  if (!date) {
    date = moment().format('YYYY-MM-DD');
  }

  return knex.distinct('description', 'date')
    .select()
    .from('entry')
    .where('description', 'LIKE', '%k.h.%')
    .leftJoin('document', 'entry.document_id', 'document.id').orderBy('date', 'desc')
    .then((data) => {

      const ret = { stock: {}, avg: {} };
      let tx;
      for (let i = 0; i < data.length; i++) {
        // Parse it.
        try {
          tx = parser.parse(data[i].description);
        } catch (err) {
          continue;
        }
        // Look for average.
        if (tx.has('target') && tx.has('avg') && tx.service) {
          const target = tx.getTarget();
          if (targets === null || missingAvg.has(tx.getTarget())) {
            if (dateFromDb(data[i].date) > date) {
              dump.error('Found future average on', dateFromDb(data[i].date), 'for ' + tx.getTarget() + ' that is newer than', date);
            } else {
              missingAvg.delete(target);
              if (ret.avg[target] === undefined) {
                ret.avg[target] = tx.avg;
              }
            }
          }
        }
        // Look for stock.
        if (tx.has('target') && tx.has('stock') && tx.service) {
          const target = tx.getTarget();
          if (targets === null || missingStock.has(tx.getTarget())) {
            if (dateFromDb(data[i].date) > date) {
              dump.error('Found future stock on', dateFromDb(data[i].date), 'for ' + tx.getTarget() + ' that is newer than', date);
            } else {
              missingStock.delete(target);
              if (ret.stock[target] === undefined) {
                ret.stock[target] = tx.stock;
              }
            }
          }
        }

        // Are we done?
        if (targets !== null && missingAvg.values().length === 0 && missingStock.values().length === 0) {
          break;
        }
      }

      return ret;
    })
    .then((known) => {
      missingAvg.forEach((target) => (known[target] = 0.0));
      return known;
    });
}

module.exports = {
  findPriceAndStock: findPriceAndStock
};
