const Import = require('../import');
const Tx = require('../../tx/Tx');
const config = require('../../config');
const num = require('../../util/num');

const TRANSFERS_REXEG = /^Email,Date \([-+]\d\d:\d\d\),Operation id,Type,Amount,Transaction hash,Main account balance,Currency/;
const TRADE_REXEG = /^Email,Date \([-+]\d\d:\d\d\),Instrument,Trade ID,Order ID,Side,Quantity,Price,Volume,Fee,Rebate,Total/;

class HitBTCImport extends Import {

  constructor() {
    super('HitBTC');
    this.fileType = null;
  }

  isMine(content) {
    if (TRANSFERS_REXEG.test(content)) {
      this.fileType = 'transfer';
      return true;
    }
    if (TRADE_REXEG.test(content)) {
      this.fileType = 'trade';
      return true;
    }
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
    if (this.fileType === 'trade') {
      return this.service + ':' + this.fund + ':' + (group[0].Order_ID);
    }
    return this.service + ':' + this.fund + ':' + (group[0].Transaction_hash);
  }

  recognize(group) {
    if (group[0].Type === 'Deposit') {
      return 'move-in';
    }
    if (group[0].Order_ID) {
      return 'trade';
    }
    throw new Error('Cannot recognize ' + JSON.stringify(group));
  }

  target(group, obj) {
    switch (obj.type) {
      case 'move-in':
        return group[0].Currency;
      case 'trade':
        switch (group[0].Side) {
          case 'sell':
            return group[0].Instrument.split('/')[0];
        }
    }
    throw new Error('Cannot find target from ' + JSON.stringify(group));
  }

  source(group, obj) {
    switch (obj.type) {
      case 'trade':
        switch (group[0].Side) {
          case 'sell':
            return group[0].Instrument.split('/')[1];
        }
    }
    throw new Error('Cannot find source from ' + JSON.stringify(group));
  }

  async total(group, obj, fyffe) {
    if (group.length > 1) {
      throw new Error('More than one not implemented yet in total().');
    }
    switch (obj.type) {
      case 'move-in':
        return num.cents(fyffe.stock.getAverage(obj.target) * parseFloat(group[0].Amount));
    }
    // TODO: Calculate whole group.
    const [sell, buy] = group[0].Instrument.split('/');
    const quantity = parseFloat(group[0].Quantity);
    console.log(group);
    console.log(sell, buy);
    console.log(quantity);
    const rate = await Tx.fetchRate(group[0].Date, `KRAKEN:${buy}`);
    console.log(rate);
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
