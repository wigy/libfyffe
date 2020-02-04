const Import = require('../import');
const config = require('../../config');
const num = require('../../util/num');

class CoinbaseImport extends Import {

  constructor() {
    super('Coinbase');
  }

  isMine(content) {
    return content.substr(0, 17) === 'Transactions\nUser';
  }

  load(file) {
    // Remove initial lines.
    file = file.replace(/Transactions\nUser.*?\nAccount.*?\n\n/, '');
    file = file.replace(' (visit https://www.coinbase.com/transactions/[ID] in your browser)', '');
    file = file.replace(' (visit https://www.coinbase.com/tx/[HASH] in your browser for more info)', '');
    return this.loadCSV(file);
  }

  grouping(entries) {
    const ret = {};
    entries.forEach((entry) => {
      let key = entry.Transfer_ID;
      if (!key) {
        key = entry.Coinbase_ID;
      }
      if (!key) {
        throw new Error('No key found from ' + JSON.stringify(entries));
      }
      ret[key] = ret[key] || [];
      ret[key].push(entry);
    });

    return Object.values(ret);
  }

  id(group) {
    return this.service + ':' + this.fund + ':' + (group[0].Transfer_ID || group[0].Coinbase_ID);
  }

  time(entry) {
    return new Date(entry.Timestamp).getTime();
  }

  recognize(group) {
    if (group.length === 1) {
      if (group[0].Currency === config.currency) {
        return parseFloat(group[0].Amount) > 0 ? 'deposit' : 'withdrawal';
      }
      return parseFloat(group[0].Amount) > 0 ? 'move-in' : 'move-out';
    }
    if (group.length === 2) {
      const eur = group.filter((g) => g.Currency === config.currency);
      const other = group.filter((g) => g.Currency !== config.currency);
      if (eur.length && other.length) {
        return parseFloat(eur[0].Amount) > 0 ? 'sell' : 'buy';
      }
    }
    throw new Error('Cannot recognize ' + JSON.stringify(group));
  }

  currency(group) {
    return config.currency;
  }

  rate(group) {
    return 1.0;
  }

  vat(group, obj) {
    return null;
  }

  target(group, obj) {
    let other;
    switch (obj.type) {
      case 'buy':
      case 'sell':
      case 'move-out':
      case 'move-in':
        other = group.filter((g) => g.Currency !== config.currency);
        if (other.length) {
          return other[0].Currency;
        }
        break;
    }
    throw new Error('Cannot find target from ' + JSON.stringify(group));
  }

  total(group, obj, fyffe) {
    const eur = group.filter((g) => g.Currency === config.currency);
    let total = 0;
    switch (obj.type) {
      case 'deposit':
        total = parseFloat(group[0].Amount);
        break;
      case 'withdrawal':
        total = -parseFloat(group[0].Amount);
        break;
      case 'buy':
        total -= parseFloat(eur[0].Amount);
        break;
      case 'sell':
        total += parseFloat(eur[0].Amount);
        break;
      case 'move-in':
        return num.cents(fyffe.stock.getAverage(obj.target) * parseFloat(group[0].Amount));
      case 'move-out':
        return num.cents(fyffe.stock.getAverage(obj.target) * -parseFloat(group[0].Amount));
      default:
        throw new Error('No total() implemented for ' + JSON.stringify(group));
    }
    return num.cents(total);
  }

  fee(group, obj) {
    const fee = group.filter((g) => parseFloat(g.Transfer_Fee) > 0);
    if (fee.length) {
      if (fee[0].Transfer_Fee_Currency !== config.currency) {
        throw new Error('Fee currency ' + fee[0].Transfer_Fee_Currency + ' not implemented.');
      }
      return num.cents(parseFloat(fee[0].Transfer_Fee));
    }
    return 0;
  }

  amount(group, obj) {
    const other = group.filter((g) => g.Currency !== config.currency);
    switch (obj.type) {
      case 'buy':
      case 'sell':
      case 'move-in':
      case 'move-out':
        return parseFloat(other[0].Amount);
      default:
        throw new Error('No amount() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  burnAmount(group, obj) {
    return null;
  }
}

module.exports = new CoinbaseImport();
