const Import = require('../import');
const config = require('../../config');
const num = require('../../util/num');

const TRANSFERS_REXEG = /^Email,Date \(\+\d\d:\d\d\),Operation id,Type,Amount,Transaction hash,Main account balance,Currency/;

class HitBTCImport extends Import {

  constructor() {
    super('HitBTC');
  }

  isMine(content) {
    return TRANSFERS_REXEG.test(content);
  }

  async load(file) {
    let data = await this.loadCSV(file);
    if (TRANSFERS_REXEG.test(file)) {
      for (const e of data) {
        e.File = 'transfer';
      }
    }
    this.replaceKey(data, /Date___/, 'Date');
    data = data.filter(e => e.Type !== 'Transfer to trading account');
    return data;
  }

  grouping(entries) {
    const ret = {};
    entries.forEach((entry) => {
      const key = this.id([entry]);
      if (!key) {
        throw new Error('No key found from ' + JSON.stringify(entries));
      }
      ret[key] = ret[key] || [];
      ret[key].push(entry);
    });

    return Object.values(ret);
  }

  time(entry) {
    return new Date(entry.Date).getTime();
  }

  id(group) {
    return this.service + ':' + this.fund + ':' + (group[0].Transaction_hash);
  }

  recognize(group) {
    if (group[0].Type === 'Deposit') {
      return 'move-in';
    }
    throw new Error('Cannot recognize ' + JSON.stringify(group));
  }

  target(group, obj) {
    switch (obj.type) {
      case 'move-in':
        return group[0].Currency;
    }
    throw new Error('Cannot find target from ' + JSON.stringify(group));
  }

  total(group, obj, fyffe) {
    switch (obj.type) {
      case 'move-in':
        return num.cents(fyffe.stock.getAverage(obj.target) * parseFloat(group[0].Amount));
    }
    throw new Error('No total() implemented for ' + JSON.stringify(group));
  }

  fee(group, obj) {
    switch (obj.type) {
      case 'move-in':
        return 0.00;
    }
    throw new Error('No fee() implemented for ' + JSON.stringify(group));
  }

  amount(group, obj) {
    switch (obj.type) {
      case 'move-in':
        return parseFloat(group[0].Amount);
      default:
        throw new Error('No amount() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  burnAmount(group, obj) {
    return null;
  }

  notes(group, obj) {
    return '';
  }
}

module.exports = new HitBTCImport();
