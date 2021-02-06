const Import = require('../import');

class GDAXImport extends Import {

  constructor() {
    super('GDAX');
  }

  isMine(content) {
    return /^(portfolio,)?type,time,amount,balance,amount.balance unit,transfer id,trade id,order id/.test(content);
  }

  // Helper to find src entries of given type (and optionally given unit).
  _srcType(group, type, unit = null) {
    const matches = group.filter((tx) => tx.type === type && (unit === null || tx.amount_balance_unit === unit));
    return matches.length ? matches : null;
  }

  async load(file) {
    return this.loadCSV(file);
  }

  id(group) {
    return this.service + ':' + this.fund + ':' + (group[0].trade_id || group[0].transfer_id);
  }

  time(entry) {
    return new Date(entry.time).getTime();
  }

  grouping(entries) {
    const ret = {};
    entries.forEach((entry) => {
      let key = entry.trade_id;
      if (['deposit', 'withdrawal'].includes(entry.type)) {
        key = entry.transfer_id;
      }
      if (!key) {
        throw new Error('No key found from ' + JSON.stringify(entries));
      }
      ret[key] = ret[key] || [];
      ret[key].push(entry);
    });

    return Object.values(ret);
  }

  recognize(group) {
    if (group.length === 1) {
      if (['deposit', 'withdrawal'].includes(group[0].type)) {
        if (group[0].amount_balance_unit === 'EUR') {
          return group[0].type;
        }
        return parseFloat(group[0].amount) > 0 ? 'move-in' : 'move-out';
      }
    } else if (group.length <= 3) {
      const matches = this._srcType(group, 'match');
      if (matches) {
        const eur = this._srcType(group, 'match', 'EUR');
        if (eur) {
          return parseFloat(eur[0].amount) > 0 ? 'sell' : 'buy';
        }
      }
      return 'trade';
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

  target(group, obj) {
    if (obj.type === 'trade') {
      const targets = group.filter((tx) => tx.type !== 'fee' && parseFloat(tx.amount) > 0);
      if (targets.length) {
        return targets[0].amount_balance_unit;
      }
    }

    if (group.length === 1) {
      return group[0].amount_balance_unit;
    }
    const fee = this._srcType(group, 'fee');
    if ((fee && group.length === 3) || (!fee && group.length === 2)) {
      const other = group.filter((tx) => tx.amount_balance_unit !== 'EUR');
      if (other.length) {
        return other[0].amount_balance_unit;
      }
    }
    throw new Error('Cannot find target from ' + JSON.stringify(group));
  }

  source(group) {
    const targets = group.filter((tx) => tx.type !== 'fee' && parseFloat(tx.amount) < 0);
    if (targets.length) {
      return targets[0].amount_balance_unit;
    }
    throw new Error('Cannot find source from ' + JSON.stringify(group));
  }

  total(group, obj, fyffe) {
    let eur, fee;
    let total = 0;
    switch (obj.type) {
      case 'move-in':
        return Math.round(100 * fyffe.stock.getAverage(obj.target) * group[0].amount) / 100;
      case 'move-out':
        return Math.round(-100 * fyffe.stock.getAverage(obj.target) * group[0].amount) / 100;
      case 'buy':
        eur = this._srcType(group, 'match', 'EUR');
        total += -parseFloat(eur[0].amount);
        fee = this._srcType(group, 'fee', 'EUR');
        if (fee) {
          total += -parseFloat(fee[0].amount);
        }
        break;
      case 'sell':
        eur = this._srcType(group, 'match', 'EUR');
        total += parseFloat(eur[0].amount);
        break;
      case 'deposit':
        eur = this._srcType(group, 'deposit', 'EUR');
        total = parseFloat(eur[0].amount);
        break;
      case 'withdrawal':
        eur = this._srcType(group, 'withdrawal', 'EUR');
        total = -parseFloat(eur[0].amount);
        break;
      case 'trade':
        total = 0;
        break;
      default:
        throw new Error('No total() implemented for ' + JSON.stringify(group));
    }
    return Math.round(100 * total) / 100;
  }

  fee(group, obj) {
    const fee = this._srcType(group, 'fee');
    if (fee) {
      if (fee[0].amount_balance_unit !== 'EUR') {
        return 0;
      }
      return Math.round(-100 * parseFloat(fee[0].amount)) / 100;
    }
    return 0;
  }

  tax(group) {
    return null;
  }

  amount(group, obj) {
    let targets;
    const other = group.filter((tx) => tx.amount_balance_unit !== 'EUR');
    switch (obj.type) {
      case 'move-in':
      case 'move-out':
        if (other) {
          return parseFloat(other[0].amount);
        }
        break;
      case 'sell':
      case 'buy':
        if (other) {
          return parseFloat(other[0].amount);
        }
        break;
      case 'trade':
        targets = group.filter((tx) => tx.type !== 'fee' && parseFloat(tx.amount) > 0);
        if (targets.length) {
          return parseFloat(targets[0].amount);
        }
        break;
      default:
        throw new Error('No amount() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  given(group, obj) {
    let targets;
    switch (obj.type) {
      case 'trade':
        targets = group.filter((tx) => tx.type !== 'fee' && parseFloat(tx.amount) < 0);
        if (targets.length) {
          return parseFloat(targets[0].amount);
        }
        break;
      default:
        throw new Error('No given() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  burnAmount(group, obj) {
    return null;
  }

  notes(group, obj) {
    return '';
  }
}

module.exports = new GDAXImport();
