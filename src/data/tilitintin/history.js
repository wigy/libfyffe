const d = require('neat-dump');

const Parser = require('../../text/Parser');
/**
 * Scan for the latest average price for the given targets.
 * @param {*} knex
 * @param {*} targets
 * @param {*} date
 * @return {Promise<Object>}
 */
function findPrice(knex, targets, date = null) {
  const parser = new Parser();
  const stamp = date === null ? new Date().getTime() : new Date(date + ' 00:00:00').getTime();
  let missing = new Set(targets);
  return knex.distinct('description', 'date')
    .select()
    .from('entry')
    .where('description', 'LIKE', '%k.h.%')
    .leftJoin('document', 'entry.document_id', 'document.id').orderBy('date', 'desc')
    .then((data) => {
      let ret = {};
      let tx;
      for (let i = 0; i < data.length; i++) {
        try {
          tx = parser.parse(data[i].description);
        } catch (err) {
          continue;
        }
        if (tx.has('target') && tx.has('avg')) {
          if (missing.has(tx.target)) {
            if (data[i].date > stamp) {
              d.error('Found future average on', new Date(data[i].date), 'for ' + tx.target + ' that is newer than', date);
            } else {
              missing.delete(tx.target);
              ret[tx.target] = tx.avg;
              if (missing.values().length === 0) {
                break;
              }
            }
          }
        }
      }
      return ret;
    })
    .then((known) => {
      missing.forEach((target) => (known[target] = 0.0));
      return known;
    });
}

module.exports = {
  findPrice: findPrice
};
