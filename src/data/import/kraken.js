const Import = require('../import');

class KrakenImport extends Import {

  constructor() {
    super('Kraken');
  }

  isMine(content) {
    return /^"txid","refid","time","type","aclass","asset","amount","fee","balance"/.test(content);
  }

  // Helper to convert asset code to target.
  asset2target(asset) {
    switch (asset) {
      case 'XXRP':
        return 'XRP';
      case 'XMLN':
        return 'MLN';
      case 'XXLM':
        return 'XLM';
      case 'XTZ':
        return 'XTZ';
      case 'XZEC':
        return 'ZEC';
      case 'XLTC':
        return 'LTC';
      case 'XETH':
        return 'ETH';
      case 'XXBT':
        return 'BTC';
      case 'BCH':
        return 'BCH';
      case 'EOS':
        return 'EOS';
    }
    throw new Error('Cannot recognize asset ' + asset);
  }

  load(file) {
    return this.loadCSV(file);
  }

  id(group) {
    return this.service + ':' + this.fund + ':' + group[0].refid;
  }

  time(entry) {
    return new Date(entry.time).getTime();
  }

  grouping(entries) {
    let ret = {};
    entries.forEach((entry) => {
      // Drop entries without transaction ID.
      if (!entry.txid) {
        return;
      }
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
      if (/^deposit-[A-Z]+$/.test(what)) {
        return 'move-in';
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

    console.log('group', group);

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
        }
      }
    });
    return Math.round(total * 100) / 100;
  }

  tax(group) {
    return null;
  }

  vat(group, obj) {
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

  burnTarget(group, obj) {
    let ret = null;
    group.forEach((entry) => {
      if (parseFloat(entry.fee) && entry.asset !== 'ZEUR') {
        ret = this.asset2target(entry.asset);
      }
    });
    return ret;
  }

  burnAmount(group, obj) {
    let ret = null;
    group.forEach((entry) => {
      if (parseFloat(entry.fee) && entry.asset !== 'ZEUR') {
        ret = -parseFloat(entry.fee);
      }
    });
    return ret;
  }
}

module.exports = new KrakenImport();
