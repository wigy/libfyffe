const config = require('../config');
const Tx = require('./Tx');
const num = require('../util/num');
const text = require('../text/make');
const dump = require('neat-dump');

/**
 * Tradeable commodity `given` x `source` is exchanged into the other tradable commodity `amount` x `target`.
 * Optionally the trade is paid with burning some `burnAmount` of the commodity `burnTarget`.
 */
module.exports = class TradeTx extends Tx {

  constructor(data = {}) {
    super('trade', {
      target: undefined,
      source: undefined,
      amount: undefined,
      given: undefined,
      stock: undefined,
      avg: undefined,
      stock2: undefined,
      avg2: undefined,
      fee: 0.0,
      burnTarget: undefined,
      burnAmount: undefined,
      notes: null
    }, data);
  }

  sellPrice() {
    const ticker = this.service.toUpperCase() + ':' + this.target;
    const buyPrice = num.cents(-this.given * this.avg2);
    const sellRate = Tx.getRate(this.time, ticker);
    const sellPrice = num.cents(this.amount * sellRate);
    const diff = num.cents(buyPrice - sellPrice);
    if (diff === 0) {
      return num.cents(this.total - this.fee);
    }
    return sellPrice;
  }

  getMyEntries() {
    const ret = [
      { number: this.getAccount('targets', this.source), amount: num.cents(-this.total) }
    ];
    if (this.fee) {
      ret.push({ number: this.getAccount('fees'), amount: this.fee });
    }
    if (config.flags.tradeProfit) {
      // Calculate profit immediately if historical rate is found.
      const buyPrice = num.cents(-this.given * this.avg2);
      const ticker = this.service.toUpperCase() + ':' + this.target;
      const sellRate = Tx.getRate(this.time, ticker);
      if (sellRate !== null) {
        const sellPrice = this.sellPrice();
        const diff = num.cents(buyPrice - sellPrice);
        if (diff > 0) {
          // In losses, add to debit side into losses.
          ret.push({ number: this.getAccount('losses'), amount: diff });
          ret.push({ number: this.getAccount('targets', this.target), amount: sellPrice });
        } else if (diff < 0) {
          // In profits, add to credit side into profits
          ret.push({ number: this.getAccount('profits'), amount: diff });
          ret.push({ number: this.getAccount('targets', this.target), amount: sellPrice });
        } else {
          ret.push({ number: this.getAccount('targets', this.target), amount: num.cents(this.total - this.fee) });
        }
        return ret;
      } else {
        dump.warning(`Not able to find selling rate for ${ticker} on ${new Date(this.time)}.`);
      }
    }
    ret.push({ number: this.getAccount('targets', this.target), amount: num.cents(this.total - this.fee) });
    return ret;
  }

  getMyText() {
    let opts = [];
    if (this.notes) {
      opts.push(text.option(this.notes, this));
    }
    if (this.burnAmount) {
      opts.push(text.option('burn', this));
    }
    opts = opts.concat([
      text.option('stock', this),
      text.option('stockLeft', this),
      text.option('averageNow', this)
    ]);
    return text.withOptions(text.tx(this), opts);
  }

  updateStock(stock) {
    // TODO: Remove code duplication with BuyTx, MoveOutTx and MoveInTx.
    const addTotal = !this.total;
    if (addTotal) {
      this.total = num.cents(-this.requireAverage(stock, this.getSource()) * this.given);
    }
    if (this.burnAmount) {
      const burned = -this.burnAmount * this.requireAverage(stock, this.getBurnTarget());
      if (addTotal) {
        this.total += burned;
      }
      stock.add(this.burnAmount, this.getBurnTarget(), burned);
      this.fee = num.cents(this.fee + burned);
    }
    const src = stock.add(this.given, this.getSource(), this.total);
    this.stock2 = src.amount;
    this.avg2 = src.avg;
    const dst = stock.add(this.amount, this.getTarget(), this.sellPrice());
    this.stock = dst.amount;
    this.avg = dst.avg;
  }
};
