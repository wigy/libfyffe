const d = require('neat-dump');
const Import = require('../import');

class KrakenImport extends Import {

  constructor() {
    super('Kraken');
  }

  // Helper to convert asset code to target.
  asset2target(asset) {
    switch (asset) {
      case 'XETH':
        return 'ETH';
      case 'XXBT':
        return 'BTC';
      case 'BCH':
        return 'BCH';
    }
    throw new Error('Cannot recognize asset ' + asset);
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
      if (/^withdrawal-[A-Z]+$/.test(what)) {
        return 'move-out';
      }
    }

    if (group.length === 2) {
      const euro = group.filter((entry) => entry.asset === 'ZEUR');
      if (euro.length) {
        return parseFloat(euro[0].amount) < 0 ? 'buy' : 'sell';
      }
      if (group[0].type === 'trade' && group[1].type === 'trade') {
        return 'trade';
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
    if (crypto.length === 1) {
      return this.asset2target(crypto[0].asset);
    }
    if (crypto.length === 2) {
      const dst = group.filter((entry) => parseFloat(entry.amount) > 0);
      return this.asset2target(dst[0].asset);
    }
    throw new Error('Cannot recognize trade target for ' + JSON.stringify(group));
  }

  source(group) {
    const src = group.filter((entry) => parseFloat(entry.amount) < 0);
    return this.asset2target(src[0].asset);
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
      if (parseFloat(entry.fee)) {
        if (entry.asset === 'ZEUR') {
          total += Math.abs(parseFloat(entry.fee));
        } else {
          d.red('No handler for fee in entry ' + JSON.stringify(entry));
        }
      }
    });
    return Math.round(total * 100) / 100;
  }

  tax(group) {
    return null;
  }

  amount(group, obj) {
    const crypto = group.filter((entry) => entry.asset !== 'ZEUR');
    if (crypto.length === 1) {
      return parseFloat(crypto[0].amount);
    }
    if (crypto.length === 2) {
      const dst = group.filter((entry) => parseFloat(entry.amount) > 0);
      return parseFloat(dst[0].amount);
    }
    throw new Error('Cannot recognize amount of trade for ' + JSON.stringify(group));
  }

  given(group, obj) {
    if (group.length === 2) {
      const dst = group.filter((entry) => parseFloat(entry.amount) < 0);
      return parseFloat(dst[0].amount);
    }
    throw new Error('Cannot recognize amount given for ' + JSON.stringify(group));
  }
}

module.exports = new KrakenImport();
