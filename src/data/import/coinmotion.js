const sprintf = require('sprintf-js').sprintf;
const Import = require('../import');

class CoinmotionImport extends Import {

  constructor() {
    super('Coinmotion');
  }

  isMine(content) {
    return /^Date,Account,Type,Status,Amount,Fee,Rate,Message,Reserved,Balance/.test(content);
  }

  load(file) {
    return this.loadCSV(file);
  }

  id(group) {
    return this.service + ':' + this.dateAndLineId(group);
  }

  time(entry) {
    const [, d, m, y, min, sec] = /^(\d+)\.(\d+)\.(\d+) (\d+):(\d+)/.exec(entry.Date);
    const stamp = sprintf('%04d-%02d-%02d %02d:%02d:00', parseInt(y), parseInt(m), parseInt(d), parseInt(min), parseInt(sec));
    return new Date(stamp).getTime();
  }

  grouping(entries) {
    let ret = {};
    entries.forEach((entry) => {
      let name = entry.Date + '/' + entry.Type;
      ret[name] = ret[name] || [];
      ret[name].push(entry);
    });
    return Object.values(ret);
  }

  recognize(group) {

    if (group.length === 1) {
      switch (group[0].Type) {
        case 'Deposit':
          return 'deposit';
        case 'Sent payment':
          return 'move-out';
        case 'Account transfer':
          if (group[0].Message === 'BTG Proceeds') {
            return 'dividend';
          }
      }
    }

    if (group.length >= 2) {
      switch (group[0].Type) {
        case 'Buy':
        case 'Buy stop':
        case 'Limit buy':
          return 'buy';
        case 'Sell':
        case 'Sell stop':
          return 'sell';
      }
    }

    throw new Error('Cannot recognize entry ' + JSON.stringify(group));
  }

  currency(group) {
    return 'EUR';
  }

  rate(group) {
    return 1.0;
  }

  vat(group, obj) {
    return null;
  }

  target(group) {
    const crypto = group.filter((entry) => entry.Account !== 'EUR');
    if (crypto.length) {
      switch (crypto[0].Account) {
        case 'BTC':
          return 'BTC';
      }
    }
    throw new Error('Cannot recognize trade target for ' + JSON.stringify(group));
  }

  total(group, obj) {
    if (obj.type === 'dividend') {
      // No good way to calculate it here.
      return 0;
    }
    let total = 0;
    group.forEach((entry) => {
      if (entry.Account === 'EUR') {
        total += Math.abs(parseFloat(entry.Amount.replace(/ €/, '')));
      }
    });
    if (obj.type === 'sell') {
      total += this.fee(group, true);
    }
    return Math.round(total * 100) / 100;
  }

  fee(group, noRounding = false) {
    let total = 0;
    group.forEach((entry) => {
      if (entry.Account === 'EUR') {
        total += Math.abs(parseFloat(entry.Fee.replace(/ €/, '')));
      }
    });
    return noRounding ? total : Math.round(total * 100) / 100;
  }

  tax(group, obj) {
    return obj.type === 'dividend' ? 0 : null;
  }

  amount(group, obj) {
    let total = 0;
    group.forEach((entry) => {
      if (entry.Account === obj.target) {
        total += Math.abs(parseFloat(entry.Amount.replace(/ [A-Z]+/, '')));
      }
    });
    return obj.type === 'sell' || obj.type === 'move-out' ? -total : total;
  }

  given(group, obj) {
    return 0;
  }

  burnAmount(group, obj) {
    return null;
  }
}

module.exports = new CoinmotionImport();
