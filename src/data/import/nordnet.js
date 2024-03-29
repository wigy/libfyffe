const Import = require('../import');

class NordnetImport extends Import {

  constructor() {
    super('Nordnet');
    this.delimiter = null;
    this.version = null;
  }

  isMine(content) {
    if (/^Id;Kirjausp.iv.;Kauppap.iv.;Maksup.iv.;/.test(content)) {
      this.delimiter = ';';
      this.version = 1;
      return true;
    }
    if (/^\s*Id\tKirjausp.iv.\sKauppap.iv.\sMaksup.iv./.test(content)) {
      this.delimiter = '\t';
      this.version = 2;
      return true;
    }
  }

  // Helper to convert string amount to float value.
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

  // Helper to get ID from entry.
  _id(entry) {
    let ret = entry.Vahvistusnumero_Laskelma;
    if (entry.Tapahtumatyyppi === 'LAINAKORKO' || entry.Tapahtumatyyppi === 'P__OMIT_YLIT_KORKO') {
      ret += entry.Valuutta + entry.Kirjausp_iv_;
    }
    return ret;
  }

  async load(file) {
    let data = await this.loadCSV(file, { delimiter: this.delimiter });
    if (this.version === 2) {
      data = data.map(e => ({
        ...e,
        Vahvistusnumero_Laskelma: e.Vahvistusnumero,
        Valuuttakurssi: e.Vaihtokurssi
      }));
    }
    return data;
  }

  id(group) {
    return this.service + ':' + this.fund + ':' + this._id(group[0]);
  }

  trimItem(obj) {
    obj.Tapahtumatyyppi = obj.Tapahtumatyyppi.replace(/\W/g, '_');
    return obj;
  }

  time(entry) {
    return new Date(entry.Kirjausp_iv_).getTime();
  }

  grouping(entries) {
    const ret = {};
    entries.forEach((entry) => {
      if (!entry.Vahvistusnumero_Laskelma) {
        return;
      }
      const idx = this._id(entry);
      ret[idx] = ret[idx] || [];
      ret[idx].push(entry);
    });
    return Object.values(ret);
  }

  recognize(group) {
    const types = group.map((tx) => tx.Tapahtumatyyppi);
    const texts = group.map((tx) => tx.Tapahtumateksti);
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
    if (types.includes('LAINAKORKO') || types.includes('P__OMIT_YLIT_KORKO')) {
      return 'interest';
    }
    if (types.includes('TALLETUS')) {
      return 'deposit';
    }
    if (types.includes('NOSTO')) {
      return 'withdrawal';
    }
    if (types.includes('DEBET_KORON_KORJ_')) {
      return 'income';
    }
    if (texts.includes('RECLASSIFICATION OF DIVIDEND')) {
      return 'income';
    }
    if (/^RECLASSIFICATION TAX/.test(texts[0])) {
      return 'income';
    }
    if (types.includes('VAIHTO_AP_OTTO') && types.includes('VAIHTO_AP_J_TT_')) {
      return 'trade';
    }
    if (group.length === 2 && group[0].Tapahtumateksti.startsWith('REVERSE SPLIT')) {
      return 'trade';
    }
    if (types.includes('ETF_KK_S__ST_N_PALVELUMAKSU')) {
      return 'expense';
    }
    if (types.includes('LUNASTUS_AP_OTTO') && /knock out/i.test(group[0].Instrumenttityyppi)) {
      return 'sell';
    }

    throw new Error('Cannot recognize entry with types ' + types.join(', ') + ': ' + JSON.stringify(group));
  }

  currency(group) {
    let acc = this._received(group);
    if (!acc) {
      acc = this._given(group);
    }
    if (!acc && /knock out/i.test(group[0].Instrumenttityyppi)) {
      acc = group[0];
    }
    switch (acc.Valuutta) {
      case 'USD':
      case 'EUR':
      case 'SEK':
        return acc.Valuutta;
      case '':
        if (acc.Valuuttakurssi === '1') {
          return 'EUR';
        }
        if (acc.Tapahtumatyyppi === 'OSINKO') {
          const match = / ([A-Z]{3})\/OSAKE$/.exec(acc.Tapahtumateksti);
          if (match) {
            return match[1];
          }
        }
      // eslint-disable-next-line no-fallthrough
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

  target(group, obj) {
    let ticker;
    if (obj.type === 'trade') {
      if (group[0].Tapahtumateksti.startsWith('REVERSE SPLIT')) {
        return group[0].Arvopaperi;
      }
      ticker = group.filter(g => g.Tapahtumatyyppi === 'VAIHTO_AP_J_TT_')[0].Arvopaperi;
    } else if (obj.type === 'income') {
      return 'MISC';
    } else if (obj.type === 'expense') {
      return 'BANK';
    } else {
      ticker = group[0].Arvopaperi;
    }
    if (!ticker) {
      const given = this._given(group);
      if (given && given.Valuutta) {
        return given.Valuutta;
      }
      throw new Error('Cannot recognize target from ' + JSON.stringify(group));
    }
    return ticker.replace(/ /g, '-');
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
          const fees = Math.abs(this.num(tx.Maksut !== undefined ? tx.Maksut : tx.Kokonaiskulut));
          sum += fees * rate;
        }
      });
    }
    return Math.round(100 * sum) / 100;
  }

  fee(group) {
    let sum = 0;
    group.forEach((tx) => {
      if (tx.Kokonaiskulut_Valuutta && tx.Kokonaiskulut !== '0' && tx.Kokonaiskulut_Valuutta !== 'EUR') {
        throw new Error('No handling for fee in other currency than EUR.');
      }
      const fees = Math.abs(this.num(tx.Maksut !== undefined ? tx.Maksut : tx.Kokonaiskulut));
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

  vat(group, obj) {
    return null;
  }

  given(group, obj) {
    if (obj.type === 'trade') {
      if (group[0].Tapahtumateksti.startsWith('REVERSE SPLIT')) {
        const old = group.filter(g => g.Arvopaperi.endsWith('OLD'))[0];
        return -parseInt(this.num(old.M__r_));
      }
      const burn = group.filter(g => g.Tapahtumatyyppi === 'VAIHTO_AP_OTTO')[0];
      return -parseInt(burn.M__r_);
    }
    const dividend = group.filter((tx) => tx.Tapahtumatyyppi === 'OSINKO');
    const text = dividend[0].Tapahtumateksti;
    if (text) {
      const match = /^(VOPR )?OSINKO .*? ([0-9,.]+) /i.exec(text);
      if (match) {
        return parseFloat(match[2].replace(/,/, '.'));
      }
    }
    return null;
  }

  amount(group, obj) {
    if (obj.type === 'trade') {
      if (group[0].Tapahtumateksti.startsWith('REVERSE SPLIT')) {
        const fresh = group.filter(g => !g.Arvopaperi.endsWith('OLD'))[0];
        return parseInt(this.num(fresh.M__r_));
      }
      const burn = group.filter(g => g.Tapahtumatyyppi === 'VAIHTO_AP_J_TT_')[0];
      return parseInt(burn.M__r_);
    }
    const tx = group.filter((tx) => parseInt(this.num(tx.M__r_)));
    if (!tx.length) {
      return null;
    }
    const sum = parseFloat(this.num(tx[0].M__r_));
    return obj.type === 'sell' ? -sum : sum;
  }

  source(group, obj) {
    if (obj.type === 'trade') {
      if (group[0].Tapahtumateksti.startsWith('REVERSE SPLIT')) {
        const fresh = group.filter(g => !g.Arvopaperi.endsWith('OLD'))[0];
        return fresh.Arvopaperi;
      }
      const burn = group.filter(g => g.Tapahtumatyyppi === 'VAIHTO_AP_OTTO')[0];
      return burn.Arvopaperi;
    }
    return null;
  }

  burnAmount(group, obj) {
    return null;
  }

  notes(group, obj) {
    if (obj.type === 'expense') {
      return 'Kuukausisäästömaksu';
    }

    if (obj.target === 'MISC') {
      const texts = group.map((tx) => tx.Tapahtumateksti);
      if (texts.includes('RECLASSIFICATION OF DIVIDEND')) {
        return 'Osingon uudelleenluokittelu';
      }
      if (/^RECLASSIFICATION TAX/.test(texts[0])) {
        return 'Veron uudelleenluokittelu';
      }
      return 'Koron korjaus';
    }
    return null;
  }
}

module.exports = new NordnetImport();
