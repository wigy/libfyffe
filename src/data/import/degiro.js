const Import = require('../import');
const { isin2ticker } = require('../oracle');

class DegiroImport extends Import {

  constructor() {
    super('Degiro');
  }

  // Helper to convert string amount to parseable string.
  num(str) {
    return parseFloat(str.replace(',', '.'));
  }

  // Helper to add generic types to entries.
  _types(group) {
    return group.map((entry) => {
      if (/^Sell \d+/.test(entry.Kuvaus)) {
        entry.type = 'sell';
      } else if (/^Buy \d+/.test(entry.Kuvaus)) {
        entry.type = 'buy';
      } else if (/Connection Fee/.test(entry.Kuvaus)) {
        entry.type = 'fee';
      } else {
        switch (entry.Kuvaus) {
          case 'Giro CashFund Compensation':
            entry.type = 'income';
            break;
          case 'DEGIRO Transaction Fee':
          case 'Trustly-Sofort payment fee':
            entry.type = 'fee';
            break;
          case 'iDEAL / Sofort Deposit':
          case 'Deposit':
            entry.type = 'deposit';
            break;
          case 'Withdrawal':
            entry.type = 'withdrawal';
            break;
          case 'FX Credit':
          case 'FX Withdrawal':
            entry.type = 'fx';
            break;
          case 'Dividend':
            entry.type = 'dividend';
            break;
          case 'Dividend Tax':
            entry.type = 'tax';
            break;
          default:
            throw new Error('Cannot recognize type of entry from description ' + JSON.stringify(entry.Kuvaus));
        }
      }
      return entry;
    });
  }

  isMine(content) {
    return /^Päiväys,Aika,Value date,Tuote,ISIN,Kuvaus,FX/.test(content);
  }

  load(file) {
    return this.loadCSV(file, {delimiter: ','});
  }

  id(group) {
    return group[0].P_iv_ys + ' ' + group[0].Aika;
  }

  time(entry) {
    const [, D, M, Y] = /^(\d\d)-(\d\d)-(\d\d\d\d)$/.exec(entry.P_iv_ys);
    return new Date(Y + '-' + M + '-' + D + ' ' + entry.Aika).getTime();
  }

  grouping(entries) {
    let ret = {};
    entries.forEach((entry) => {
      let id = entry.P_iv_ys + ' ' + entry.Aika;
      if (!id) {
        return;
      }
      if (entry.Column9 === '') {
        // No money value given.
        return;
      }
      // Separate FX operations.
      if (/^FX (Credit|Withdrawal)/.test(entry.Kuvaus)) {
        id += 'FX';
      }
      ret[id] = ret[id] || [];
      ret[id].push(entry);
      if (ret[id].length > 5) {
        console.log(ret[id]);
        throw new Error('Too many entries in one group (maybe same timestamp accidentally?)');
      }
    });
    return Object.values(ret);
  }

  recognize(group) {
    const types = this._types(group).map(entry => entry.type);
    if (types.length === 1 && types[0] === 'fee') {
      return 'expense';
    }
    if (types.includes('income')) {
      return 'income';
    }
    if (types.includes('deposit')) {
      return 'deposit';
    }
    if (types.includes('buy')) {
      return 'buy';
    }
    if (types.includes('sell')) {
      return 'sell';
    }
    if (types.includes('withdrawal')) {
      return 'withdrawal';
    }
    if (types.includes('dividend')) {
      return 'dividend';
    }
    if (types.includes('fx')) {
      const eur = group.filter(tx => tx.M__r_ === 'EUR');
      return this.num(eur[0].Column9) < 0 ? 'fx-in' : 'fx-out';
    }
    throw new Error('Cannot recognize entry: ' + JSON.stringify(group));
  }

  total(group, obj) {
    let sum = 0;
    if (obj.type === 'deposit' || obj.type === 'withdrawal') {
      group.forEach((tx) => {
        if (tx.type === 'deposit' || obj.type === 'withdrawal') {
          sum += Math.abs(this.num(tx.Column9));
        }
      });
    } else if (obj.type === 'buy' || obj.type === 'sell') {
      group.forEach((tx) => {
        sum += Math.abs(this.num(tx.Column9));
      });
    } else if (obj.type === 'expense' || obj.type === 'income') {
      group.forEach((tx) => {
        sum += Math.abs(this.num(tx.Column9));
      });
    } else if (obj.type === 'fx-in' || obj.type === 'fx-out') {
      const eur = group.filter(tx => tx.M__r_ === 'EUR');
      sum += Math.abs(this.num(eur[0].Column9));
    } else if (obj.type === 'dividend') {
      const pay = group.filter(tx => tx.type === 'dividend');
      sum += Math.abs(this.num(pay[0].Column9));
    } else {
      console.log(group);
      throw new Error('Cannot find total from entry: ' + JSON.stringify(group));
    }
    return Math.round(100 * sum) / 100;
  }

  fee(group, obj) {
    let sum = 0;
    group.forEach((tx) => {
      if (tx.type === 'fee') {
        sum -= this.num(tx.Column9);
      }
    });
    return Math.round(100 * sum) / 100;
  }

  currency(group) {
    let currencies = new Set(group.map(tx => tx.M__r_));
    if (currencies.size > 1) {
      const targets = group.filter(tx => tx.M__r_ !== 'EUR');
      if (targets.length === 1) {
        return targets[0].M__r_;
      }
      throw new Error('Cannot figure out currencies ' + JSON.stringify(group));
    }
    return group[0].M__r_;
  }

  rate(group, obj) {
    // TODO: It is challenging to find the rate for Degiro...
    // It would need to grouping of those Cash Fund conversion entries to right counterparts.
    return 1.0;
  }

  vat(group, obj) {
    return null;
  }

  target(group, obj) {
    switch (obj.type) {
      case 'expense':
        return 'FEES';
      case 'income':
        return 'FEEREFUND';
      case 'fx-in':
      case 'fx-out':
        const nonEur = group.filter(tx => tx.M__r_ !== 'EUR');
        return nonEur[0].M__r_;
      case 'sell':
      case 'buy':
      case 'dividend':
        const targets = group.filter(tx => tx.type === 'buy' || tx.type === 'sell' || tx.type === 'dividend');
        if (targets.length) {
          return isin2ticker(targets[0].ISIN);
        }
    }
    throw new Error('Cannot find target from ' + JSON.stringify(group));
  }

  amount(group, obj) {
    const targets = group.filter(tx => tx.type === 'buy' || tx.type === 'sell');
    switch (obj.type) {
      case 'sell':
      case 'buy':
        const match = /(Buy|Sell) (\d+) (.+?)@([0-9,]+)/.exec(targets[0].Kuvaus);
        return parseInt(match[2]);
      case 'dividend':
        // Not found from CSV.
        return 0;
      default:
        throw new Error('Cannot find amount for ' + JSON.stringify(group));
    }
  }

  burnAmount(group, obj) {
    return null;
  }

  given(group, obj) {
    // Not found from CSV.
    return 0;
  }

  tax(group) {
    let sum = 0;
    group.forEach((tx) => {
      if (tx.type === 'tax') {
        sum += Math.abs(this.num(tx.Column9));
      }
    });
    return Math.round(100 * sum) / 100;
  }
}

module.exports = new DegiroImport();
