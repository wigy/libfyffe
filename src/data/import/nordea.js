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
    return this.loadCSV(file, { delimiter: '\t', eol: '\n\r\n', cutFromBeginning: 1 });
  }

  grouping(entries) {
    return entries.map(entry => [entry]);
  }

  id(group) {
    const ret = this.service + ':' + this.fund + ':' + (group[0].Saaja_Maksaja.replace(/\s/g, '_')).replace(/\s/g, '').toUpperCase() + '/' + this.dateAndLineId(group);
    return ret;
  }

  time(entry) {
    const match = /(\d+)\.(\d+)\.(\d+)/.exec(entry.Maksup_iv_);
    const stamp = match[3] + '-' + match[2] + '-' + match[1] + 'T12:00:00.000Z';
    return new Date(stamp).getTime();
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
    if (vatPct === null || vatPct.endsWith === '?' || typeof vatPct === 'object') {
      return vatPct;
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

  rawValue(group) {
    if (group.length > 1) {
      throw new Error('Only single entry raw values supported.');
    }
    return this.num(group[0].M__r_);
  }

  rawText(group) {
    if (group.length > 1) {
      throw new Error('Only single entry raw values supported.');
    }
    return group[0].Tapahtuma + ': ' + group[0].Viesti;
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
    return this.useMapper(group, obj, 'tags', []);
  }
}

module.exports = new NordeaImport();
