module.exports = class Entry {

  constructor(account, amount, text = null) {
    this.account = account;
    this.amount = amount;
    this.text = text;
  }
}
