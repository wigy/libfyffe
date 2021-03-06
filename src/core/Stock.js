const dump = require('neat-dump');
const num = require('../util/num');

/**
 * A container class for storing commodities and currencies.
 */
module.exports = class Stock {

  constructor() {
    this.stock = {};
    this.average = {};
  }

  /**
   * Add commodity to the stock.
   * @param {Number} count
   * @param {String} target
   * @param {Number} [price]
   * @return {Object} An object containing `amount` and `avg`.
   */
  add(count, target, price = null) {

    this.average[target] = this.average[target] || 0;
    if (price === null) {
      price = this.average[target];
    }
    const oldTotal = this.getStock(target);
    const oldAverage = this.average[target];
    const oldPrice = oldTotal * oldAverage;

    this.stock[target] = oldTotal + count;
    const newTotal = this.stock[target];
    if (count > 0) {
      if (newTotal > 0) {
        this.average[target] = (oldPrice + price) / newTotal;
      } else {
        this.average[target] = 0;
      }
    }
    // console.log('=>', count, target, this.stock[target]);
    return { amount: this.stock[target], avg: this.average[target] };
  }

  /**
   * Reduce commodity from the stock.
   * @param {Number} count
   * @param {String} target
   */
  del(count, target) {
    this.stock[target] = this.getStock(target) - count;
  }

  /**
   * Get the amount of the commodity in the stock.
   * @param {String} target
   * @return {Number}
   */
  getStock(target) {
    return (this.stock[target] || 0);
  }

  /**
   * Get the average price for the commodity in the stock.
   * @param {String} target
   * @return {Number}
   */
  getAverage(target) {
    return (this.average[target] || 0);
  }

  /**
   * Set the initial average prices for the commodities.
   * @param {Object} avg
   */
  setAverages(avg) {
    Object.keys(avg).forEach((target) => (this.average[target] = avg[target]));
  }

  /**
   * Set the initial stock counts for the commodities.
   * @param {Object} stock
   */
  setStock(stock) {
    Object.keys(stock).forEach((target) => (this.stock[target] = stock[target]));
  }

  /**
   * Dump averages loaded to the screen.
   * @param {String} title
   */
  showStock(title) {
    dump.purple(title);
    Object.keys(this.stock).sort().forEach((target) => {
      dump.green('  ', target, num.trim(this.stock[target]));
      if (this.average[target]) {
        dump.yellow('       ', num.currency(this.average[target], '€ / ' + target));
      }
    });
  }

  /**
   * Get a sorted list of symbols loaded with non-zero balance.
   */
  list() {
    return Object.keys(this.stock).filter(sym => this.stock[sym]).sort();
  }
};
