const Import = require('../import');

class NordnetImport extends Import {

  constructor() {
    super('Nordnet');
  }

  isMine(content) {
    return /^Id;Kirjausp.iv.;Kauppap.iv.;Maksup.iv.;/.test(content);
  }

  // Helper to convert string amount to parseable string.
  num(str) {
    return parseFloat(str.replace(',', '.').replace(/ /g, ''));
  }

  // Helper to find entry giving out money.
  _given(group) {
    return group.filter((tx) => this.num(tx.Summa) < 0)[0];
  }

  // Helper to find entry receiving in money.
  _received(group) {
    return group.filter((tx) => this.num(tx.Summa) > 0)[0];
  }

  load(file) {
    return this.loadCSV(file, {delimiter: ';'});
  }

  id(group) {
    return group[0].Vahvistusnumero_Laskelma;
  }

  trimItem(obj) {
    obj.Tapahtumatyyppi = obj.Tapahtumatyyppi.replace(/\W/g, '_');
    return obj;
  }

  time(entry) {
    return new Date(entry.Kirjausp_iv_).getTime();
  }

  grouping(entries) {
    let ret = {};
    entries.forEach((entry) => {
      if (!entry.Vahvistusnumero_Laskelma) {
        return;
      }
      ret[entry.Vahvistusnumero_Laskelma] = ret[entry.Vahvistusnumero_Laskelma] || [];
      ret[entry.Vahvistusnumero_Laskelma].push(entry);
    });
    return Object.values(ret);
  }

  recognize(group) {
    const types = group.map((tx) => tx.Tapahtumatyyppi);
    if (types.includes('OSINKO')) {
      return 'dividend';
    }
    if (types.includes('VALUUTAN_OSTO')) {
      return 'fx-out';
    }
    if (types.includes('MYYNTI')) {
      return 'sell';
    }
    if (types.includes('OSTO')) {
      return 'buy';
    }
    if (types.includes('LAINAKORKO')) {
      return 'interest';
    }
    if (types.includes('TALLETUS')) {
      return 'deposit';
    }
    if (types.includes('NOSTO')) {
      return 'withdrawal';
    }
    throw new Error('Cannot recognize entry with types ' + types.join(', ') + ': ' + JSON.stringify(group));
  }

  currency(group) {
    let acc = this._received(group);
    if (!acc) {
      acc = this._given(group);
    }
    switch (acc.Valuutta) {
      case 'USD':
      case 'EUR':
        return acc.Valuutta;
      default:
        throw new Error('Cannot figure out currency from ' + JSON.stringify(group));
    }
  }

  rate(group, obj) {
    let ret = 1.0;
    if (obj.type === 'fx-out') {
      let a, b;
      group.forEach((tx) => {
        if (tx.Valuutta === 'EUR') {
          a = this.num(tx.Summa);
        } else {
          b = this.num(tx.Summa);
        }
      });
      return Math.abs(a / b);
    }

    group.forEach((tx) => {
      if (tx.Valuutta !== 'EUR') {
        ret = this.num(tx.Valuuttakurssi);
      }
    });

    return ret;
  }

  target(group) {
    const ticker = group[0].Arvopaperi;
    if (!ticker) {
      const given = this._given(group);
      if (given && given.Valuutta) {
        return given.Valuutta;
      }
      throw new Error('Cannot recognize target from ' + JSON.stringify(group));
    }
    return ticker;
  }

  total(group, obj) {
    let sum = 0;
    if (obj.type === 'fx-out') {
      group.forEach((tx) => {
        if (tx.Valuutta === 'EUR') {
          sum += Math.abs(this.num(tx.Summa));
        }
      });
    } else {
      group.forEach((tx) => {
        const value = Math.abs(this.num(tx.Summa));
        const rate = Math.abs(this.num(tx.Valuuttakurssi));
        sum += value * rate;
        if (obj.type === 'sell') {
          const fees = Math.abs(this.num(tx.Maksut));
          sum += fees * rate;
        }
      });
    }
    return Math.round(100 * sum) / 100;
  }

  fee(group) {
    let sum = 0;
    group.forEach((tx) => {
      const fees = Math.abs(this.num(tx.Maksut));
      const rate = Math.abs(this.num(tx.Valuuttakurssi));
      sum += fees * rate;
    });
    return Math.round(100 * sum) / 100;
  }

  tax(group, obj) {
    if (obj.type === 'dividend') {
      const tax = group.filter((tx) => tx.Tapahtumatyyppi === 'ENNAKKOPID_TYS');
      if (tax.length) {
        let ret = -(this.num(tax[0].Summa));
        if (obj.rate) {
          ret *= obj.rate;
        }
        return ret;
      }
      return 0;
    }
    return null;
  }

  given(group, obj) {
    const dividend = group.filter((tx) => tx.Tapahtumatyyppi === 'OSINKO');
    const text = dividend[0].Tapahtumateksti;
    if (text) {
      const match = /^OSINKO .*? ([0-9,.]+) /.exec(text);
      if (match) {
        return parseFloat(match[1].replace(/,/, '.'));
      }
    }
    return null;
  }

  amount(group, obj) {
    let tx = group.filter((tx) => parseInt(this.num(tx.M__r_)));
    if (!tx.length) {
      return null;
    }
    let sum = parseInt(this.num(tx[0].M__r_));
    return obj.type === 'sell' ? -sum : sum;
  }

  burnAmount(group, obj) {
    return null;
  }
}

module.exports = new NordnetImport();
