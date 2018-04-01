const Import = require('../import');

class KrakenImport extends Import {

  constructor() {
    super('Kraken');
  }

  load(file) {
    return this.loadCSV(file);
  }

  id(group) {
    return group[0].refid;
  }

  date(entry) {
    return entry.time.substr(0, 10);
  }

  time(entry) {
    return new Date(entry.time).getTime();
  }

  grouping(entries) {
    let ret = {};
    entries.forEach((entry) => {
      ret[entry.refid] = ret[entry.refid] || [];
      ret[entry.refid].push(entry);
    });

    return Object.values(ret);
  }

  recognize(group) {

    if (group.length === 1) {
      const what = group[0].type + '-' + group[0].asset;
      if (what === 'deposit-ZEUR' || what === 'withdrawal-ZEUR') {
        return group[0].type;
      }
    }

    if (group.length === 2) {
      const euro = group.filter((entry) => entry.asset === 'ZEUR');
      if (euro.length) {
        return parseFloat(euro[0].amount) < 0 ? 'buy' : 'sell';
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

  target(group) {
    const crypto = group.filter((entry) => entry.asset !== 'ZEUR');
    if (crypto.length) {
      switch (crypto[0].asset) {
        case 'XETH':
          return 'ETH';
        case 'XXBT':
          return 'BTC';
      }
    }
    throw new Error('Cannot recognize trade target for ' + JSON.stringify(group));
  }

  total(group, obj) {
    let total = 0;
    if (obj.type === 'sell') {
      group.forEach((entry) => {
        if (entry.asset === 'ZEUR') {
          total += Math.abs(parseFloat(entry.amount));
        }
      });
    } else {
      group.forEach((entry) => {
        if (entry.asset === 'ZEUR') {
          total += Math.abs(parseFloat(entry.amount));
          total += Math.abs(parseFloat(entry.fee));
        }
      });
    }
    return Math.round(total * 100) / 100;
  }

  fee(group) {
    let total = 0;
    group.forEach((entry) => {
      if (entry.asset === 'ZEUR') {
        total += Math.abs(parseFloat(entry.fee));
      }
    });
    return Math.round(total * 100) / 100;
  }

  tax(group) {
    return null;
  }

  amount(group, obj) {
    const crypto = group.filter((entry) => entry.asset !== 'ZEUR');
    if (crypto.length) {
      return parseFloat(crypto[0].amount);
    }
    throw new Error('Cannot recognize amount of trade for ' + JSON.stringify(group));
  }
}

module.exports = new KrakenImport();