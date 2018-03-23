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
   * @param {Number} price
   * @return {Object} An object containing `amount` and `avg`.
   */
  add(count, target, price) {

    this.average[target] = this.average[target] || 0;

    const oldTotal = this.getStock(target);
    const oldAverage = this.average[target];
    const oldPrice = oldTotal * oldAverage;

    this.stock[target] = oldTotal + count;
    const newTotal = this.stock[target];
    if (count > 0) {
      this.average[target] = (oldPrice + price) / newTotal;
    }
    return {amount: this.stock[target], avg: this.average[target]};
  }

  /**
   * Reduce commodity from the stock.
   * @param {Number} count
   * @param {String} target
   */
  del(count, target) {
    this.stock[target] = this.get(target) - count;
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
};
