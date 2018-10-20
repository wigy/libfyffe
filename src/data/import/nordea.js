const safeEval = require('safe-eval');
const Import = require('../import');
const num = require('../../util/num');

class NordeaImport extends Import {

  constructor() {
    super('Nordea');
  }

  // Helper to convert string amount to float value.
  num(str) {
    return parseFloat(str.replace(',', '.').replace(/ /g, ''));
  }

  isMine(content) {
    return /^Tilinumero\t/.test(content);
  }

  load(file) {
    return this.loadCSV(file, {delimiter: '\t', eol: '\n\r\n', cutFromBeginning: 1});
  }

  grouping(entries) {
    return entries.map(entry => [entry]);
  }

  id(group) {
    return (group[0].Saaja_Maksaja.replace(/\s/g, '_')).replace(/\s/g, '').toUpperCase() + '/' + this.dateAndLineId(group);
  }

  time(entry) {
    const match = /(\d+)\.(\d+)\.(\d+)/.exec(entry.Maksup_iv_);
    const stamp = match[3] + '-' + match[2] + '-' + match[1] + 'T12:00:00.000Z';
    return new Date(stamp).getTime();
  }

  /**
   * Use the string mapper to find data for the group.
   * @param {Array} group
   * @param {String} [field]
   * @param {any} [def]
   * @return {Object}
   */
  useMapper(group, obj, field = undefined, def = undefined) {

    if (field !== undefined) {
      const data = this.useMapper(group, obj);
      if (!(field in data)) {
        if (def === undefined) {
          const name = this.mapper.findMatch('recognize', group[0]);
          throw new Error('A field `' + field + '` is not configured for `' + name + '` in ' + JSON.stringify(data));
        }
        return def;
      }
      let ret = data[field];
      if (typeof ret === 'string' && ret.substr(0, 2) === '${' && ret.substr(-1, 1) === '}') {
        ret = safeEval(ret.substr(2, ret.length - 3), {
          stock: (code) => this.stock.getStock(code),
          total: obj ? obj.total : null
        });
        if (typeof ret !== 'string' && (isNaN(ret) || ret === Infinity)) {
          throw Error('Invalid result NaN or Infinity from expression `' + data[field] + '`.');
        }
      }
      return ret;
    }

    if (group.length > 1) {
      throw new Error('String mapper cannot handle yet more than one item in the group.');
    }
    const name = this.mapper.findMatch('recognize', group[0]);
    if (!name) {
      throw new Error('Unable to find a match with string mapper: ' + JSON.stringify(group));
    }
    return this.mapper.get('txs', name);
  }

  recognize(group) {
    return this.useMapper(group, null, 'type');
  }

  currency(group) {
    return 'EUR';
  }

  rate(group) {
    return 1.0;
  }

  fee(group) {
    return 0.0;
  }

  vat(group, obj) {
    const vatPct = this.useMapper(group, obj, 'vat', null);
    if (vatPct === null) {
      return null;
    }
    const total = this.total(group, obj);
    const withoutVat = num.cents(total / (1 + vatPct / 100));
    return num.cents(total - withoutVat);
  }

  target(group, obj) {
    return this.useMapper(group, obj, 'target', null);
  }

  total(group) {
    return Math.abs(this.num(group[0].M__r_));
  }

  tax(group, obj) {
    switch (obj.type) {
      case 'dividend':
        return 0.0;
      default:
        throw new Error('Tax not implemented for ' + obj.type);
    }
  }

  amount(group, obj) {
    return this.useMapper(group, obj, 'amount');
  }

  given(group, obj) {
    return this.useMapper(group, obj, 'given');
  }

  notes(group, obj) {
    const desc = this.useMapper(group, obj, 'notes', null);
    if (desc !== null) {
      return desc;
    }
    if (obj.type === 'expense' && group[0].Viesti) {
      return group[0].Viesti;
    }
    return '';
  }

  tags(group, obj) {
    const tags = this.useMapper(group, obj, 'tags', null);
    if (typeof tags === 'string') {
      if (!/\[.+\]/.test(tags)) {
        throw new Error('Invalid tags ' + JSON.stringify(tags));
      }
      return tags.substr(1, tags.length - 2).split('][');
    }
    return [];
  }
}

module.exports = new NordeaImport();
