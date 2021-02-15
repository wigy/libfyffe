const Import = require('../import');
const Tx = require('../../tx/Tx');
const num = require('../../util/num');

const TRANSFERS_REXEG = /^Email,Date \([-+]\d\d:\d\d\),Operation id,Type,Amount,Transaction hash,Main account balance,Currency/;
const TRADE_REXEG = /^Email,Date \([-+]\d\d:\d\d\),Instrument,Trade ID,Order ID,Side,Quantity,Price,Volume,Fee,Rebate,Total/;

class HitBTCImport extends Import {

  constructor() {
    super('HitBTC');
  }

  isMine(content) {
    if (TRANSFERS_REXEG.test(content)) {
      return true;
    }
    if (TRADE_REXEG.test(content)) {
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
    if (TRADE_REXEG.test(file)) {
      for (const e of data) {
        e.File = 'trade';
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
    if (group[0].File === 'trade') {
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

  parse(group) {
    const side = group[0].Side;
    const instrument = group[0].Instrument;
    if (side !== 'buy' && side !== 'sell') {
      throw new Error(`Cannot figure out trade side ${group[0].Side}.`);
    }
    let [sell, buy] = instrument.split('/');
    const date = group[0].Date;
    let quantity = 0;
    let price = 0;
    let volume = 0;
    let fee = 0;
    let total = 0;
    for (let i = 0; i < group.length; i++) {
      if (group[i].Side !== side) {
        throw new Error(`Strange. Two different sides '${group[i].Side}' and '${side}' in the same trade ${JSON.stringify(group)}.`);
      }
      if (group[i].Instrument !== instrument) {
        throw new Error(`Strange. Two different instruments '${group[i].Instrument}' and '${instrument}' in the same trade ${JSON.stringify(group)}.`);
      }
      const q = parseFloat(group[i].Quantity);
      quantity += q;
      price += parseFloat(group[i].Price) * q;
      volume += parseFloat(group[i].Volume);
      fee += parseFloat(group[i].Fee);
      total += parseFloat(group[i].Total);
    }
    price /= quantity;
    if (side === 'buy') {
      [sell, buy] = [buy, sell];
      [quantity, volume] = [volume, quantity];
      price = 1 / price;
    }
    return { side, quantity, price, date, buy, sell, volume, fee, total };
  }

  target(group, obj) {
    const { buy } = this.parse(group);
    switch (obj.type) {
      case 'move-in':
        return group[0].Currency;
      case 'trade':
        return buy;
    }
    throw new Error('Cannot find target from ' + JSON.stringify(group));
  }

  source(group, obj) {
    const { sell } = this.parse(group);
    switch (obj.type) {
      case 'trade':
        return sell;
    }
    throw new Error('Cannot find source from ' + JSON.stringify(group));
  }

  async total(group, obj, fyffe) {
    const { price, quantity, buy, date } = this.parse(group);
    switch (obj.type) {
      case 'move-in':
        return num.cents(fyffe.stock.getAverage(obj.target) * parseFloat(group[0].Amount));
      case 'trade':
        // There are no fiat pairs for HitBTC.
        return (await Tx.fetchTradePair('KRAKEN', buy, 'EUR', date)) * price * quantity;
      default:
        throw new Error('No total() implemented for ' + JSON.stringify(group));
    }
  }

  fee(group, obj) {
    switch (obj.type) {
      case 'move-in':
      case 'trade':
        return 0.00;
    }
    throw new Error('No fee() implemented for ' + JSON.stringify(group));
  }

  amount(group, obj) {
    const { volume } = this.parse(group);
    switch (obj.type) {
      case 'move-in':
        return parseFloat(group[0].Amount);
      case 'trade':
        return volume;
      default:
        throw new Error('No amount() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  given(group, obj) {
    const { quantity } = this.parse(group);
    switch (obj.type) {
      case 'trade':
        return -quantity;
      default:
        throw new Error('No given() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  burnAmount(group, obj) {
    const { fee } = this.parse(group);
    switch (obj.type) {
      case 'trade':
        return -fee;
      default:
        throw new Error('No burnAmount() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  burnTarget(group, obj) {
    const { side, buy, sell } = this.parse(group);
    switch (obj.type) {
      case 'trade':
        return side === 'sell' ? buy : sell;
      default:
        throw new Error('No burnTarget() implemented for ' + obj.type + '-type ' + JSON.stringify(group));
    }
  }

  notes(group, obj) {
    return '';
  }
}

module.exports = new HitBTCImport();
