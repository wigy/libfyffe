const Parser = require('../../src/text/Parser');
const config = require('../../src/config');
const assert = require('assert');

describe('class Tx', () => {

  let parser;

  before(() => {
    config.set({
      language: 'fi',
      service: 'My Test Service',
      accounts: {
      },
      tags: {
        'Tag': 'Testing tag'
      }
    });
    parser = new Parser();
  });

  it('can parse transactions from texts', () => {
    let tx;

    tx = parser.parse('[Tag]Talletus My Test Service-palveluun');
    assert.equal(tx.type, 'deposit');

    tx = parser.parse('[Tag]Nosto My Test Service-palvelusta');
    assert.equal(tx.type, 'withdrawal');

    tx = parser.parse('Osto +0.55555556 BTC (yht. 2.1 BTC)');
    assert.equal(tx.type, 'buy');
    assert.equal(tx.target, 'BTC');
    assert.equal(tx.amount, 0.55555556);
    assert.equal(tx.stock, 2.1);

    tx = parser.parse('Myynti -0.55555556 BTC (jälj. 1.1 BTC)');
    assert.equal(tx.type, 'sell');
    assert.equal(tx.target, 'BTC');
    assert.equal(tx.amount, -0.55555556);
    assert.equal(tx.stock, 1.1);

    tx = parser.parse('Osto +0.55555556 BTC (yht. 10.1 BTC, k.h. nyt 11,000.00 €/BTC)');
    assert.equal(tx.type, 'buy');
    assert.equal(tx.target, 'BTC');
    assert.equal(tx.amount, 0.55555556);
    assert.equal(tx.stock, 10.1);
    assert.equal(tx.avg, 11000);

    tx = parser.parse('Myynti -0.55555556 BTC (k.h. 11,000.00 €/BTC, jälj. 1.1 BTC)');
    assert.equal(tx.type, 'sell');
    assert.equal(tx.target, 'BTC');
    assert.equal(tx.amount, -0.55555556);
    assert.equal(tx.stock, 1.1);
    assert.equal(tx.avg, 11000);

    tx = parser.parse('Osinko 5 x TSLA (kurssi 0.86 $/€)');
    assert.equal(tx.type, 'dividend');
    assert.equal(tx.target, 'TSLA');
    assert.equal(tx.amount, 5);
    assert.equal(tx.rate, 0.86);
    // assert.equal(tx.currency, 'USD'); TODO: Fix this.

    // TODO: Test fx-out.

    tx = parser.parse('Osinko 10 x NOKIA');
    assert.equal(tx.type, 'dividend');
    assert.equal(tx.target, 'NOKIA');
    assert.equal(tx.amount, 10);
    assert.equal(tx.currency, 'EUR');

    tx = parser.parse('Valuutanvaihto € -> $ (kurssi 0.86 $/€)');
    assert.equal(tx.type, 'fx-in');
    assert.equal(tx.target, 'USD');
    assert.equal(tx.currency, 'EUR');
    assert.equal(tx.rate, 0.86);

    tx = parser.parse('My Test Service lainakorko');
    assert.equal(tx.type, 'interest');
    assert.equal(tx.currency, 'EUR');

    tx = parser.parse('Siirto My Test Service-palveluun +0.12312312 LTC (yht. 0.22222222 LTC)');
    assert.equal(tx.type, 'move-in');
    assert.equal(tx.target, 'LTC');
    assert.equal(tx.amount, 0.12312312);
    assert.equal(tx.stock, 0.22222222);

    tx = parser.parse('Siirto My Test Service-palvelusta -0.56756757 LTC (jälj. 0 LTC)');
    assert.equal(tx.type, 'move-out');
    assert.equal(tx.target, 'LTC');
    assert.equal(tx.amount, -0.56756757);
    assert.equal(tx.stock, 0);
  });
});
