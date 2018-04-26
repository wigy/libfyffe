const d = require('neat-dump');

const Parser = require('../../text/Parser');
/**
 * Scan for the latest average price and stock for the given targets.
 * @param {*} knex
 * @param {*} targets
 * @param {*} date
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
function findPriceAndStock(knex, targets, date = null) {
  const parser = new Parser();
  const stamp = date === null ? new Date().getTime() : new Date(date + ' 00:00:00').getTime();
  let missingAvg = new Set(targets);
  let missingStock = new Set(targets);
  return knex.distinct('description', 'date')
    .select()
    .from('entry')
    .where('description', 'LIKE', '%k.h.%')
    .leftJoin('document', 'entry.document_id', 'document.id').orderBy('date', 'desc')
    .then((data) => {
      let ret = {stock: {}, avg: {}};
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
          if (missingAvg.has(tx.getTarget())) {
            if (data[i].date > stamp) {
              d.error('Found future average on', new Date(data[i].date), 'for ' + tx.getTarget() + ' that is newer than', date);
            } else {
              missingAvg.delete(tx.getTarget());
              ret.avg[tx.getTarget()] = tx.avg;
            }
          }
        }
        // Look for stock.
        if (tx.has('target') && tx.has('stock') && tx.service) {
          if (missingStock.has(tx.getTarget())) {
            if (data[i].date > stamp) {
              d.error('Found future stock on', new Date(data[i].date), 'for ' + tx.getTarget() + ' that is newer than', date);
            } else {
              missingStock.delete(tx.getTarget());
              ret.stock[tx.getTarget()] = tx.stock;
            }
          }
        }
        // Are we done?
        if (missingAvg.values().length === 0 && missingStock.values().length === 0) {
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
