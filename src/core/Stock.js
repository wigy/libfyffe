/**
 * A container class for storing commodities and currencies.
 */
module.exports = class Stock {

  constructor() {
    this.stock = {};
    this.average = {};
  }

  // TODO: Docs.
  add(count, target, price) {

    this.average[target] = this.average[target] || 0;

    const oldTotal = this.get(target);
    const oldAverage = this.average[target];
    const oldPrice = oldTotal * oldAverage;

    this.stock[target] = oldTotal + count;
    const newTotal = this.stock[target];
    if (count > 0) {
      this.average[target] = (oldPrice + price) / newTotal;
    }
  }

  del(count, target) {
    this.stock[target] = this.get(target) - count;
  }

  get(target) {
    return (this.stock[target] || 0);
  }
};
