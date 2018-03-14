/**
 * A container class for storing commodities and currencies.
 */
module.exports = class Stock {

  constructor() {
    this.stock = {};
  }

  // TODO: Docs.
  // TODO: Count also average price along the way.
  add(count, item) {
    this.stock[item] = this.get(item) + count;
  }

  del(count, item) {
    this.stock[item] = this.get(item) - count;
  }

  get(item) {
    return (this.stock[item] || 0);
  }
};
