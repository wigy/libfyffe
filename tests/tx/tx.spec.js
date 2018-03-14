const Tx = require('../../src/tx/Tx');
const config = require('../../src/config');
const assert = require('assert');

describe('class Tx', () => {

  before(() => {
    config.set({
      language: 'fi',
      service: 'Service-Z',
      accounts: {
      }
    });
  })

  it('cannot be instantiated without type', () => {
    assert.throws(() => new Tx(), Error);
  })

  it('can be created', () => {
    assert(Tx.create('deposit'));
    assert(Tx.create('withdrawal'));
    assert(Tx.create('sell'));
    assert(Tx.create('buy'));
    assert(Tx.create('dividend'));
    assert(Tx.create('fx-in'));
    assert(Tx.create('fx-out'));
    assert(Tx.create('interest'));
    assert(Tx.create('move-in'));
    assert(Tx.create('move-out'));
  })

  it('validates members in general', () => {
    assert.throws(() => Tx.create('deposit', {notHere: 1}), Error);
  })

  it('validates total correctly', () => {
    assert.throws(() => Tx.create('deposit', {total: null}), Error);
    assert.throws(() => Tx.create('deposit', {total: NaN}), Error);
    assert.throws(() => Tx.create('deposit', {total: undefined}), Error);
    assert.throws(() => Tx.create('deposit', {total: -1.0}), Error);
    assert.throws(() => Tx.create('deposit', {}).total, Error);

    assert.equal(Tx.create('deposit', {total: 0.0123}).total, 0.0123);
    assert.equal(Tx.create('deposit', {total: 1}).total, 1);
  })

  it('validates currency correctly', () => {
    assert.throws(() => Tx.create('fx-in', {currency: null}), Error);
    assert.throws(() => Tx.create('fx-in', {currency: NaN}), Error);
    assert.throws(() => Tx.create('fx-in', {currency: undefined}), Error);
    assert.throws(() => Tx.create('fx-in', {currency: -1.0}), Error);
    assert.throws(() => Tx.create('fx-in', {currency: ''}), Error);
    assert.throws(() => Tx.create('fx-in', {currency: 'XYZ'}), Error);

    assert.equal(Tx.create('fx-in', {}).currency, 'EUR');
    assert.equal(Tx.create('fx-in', {currency: 'USD'}).currency, 'USD');
    assert.equal(Tx.create('fx-in', {currency: 'EUR'}).currency, 'EUR');
    assert.equal(Tx.create('fx-out', {currency: 'DKK'}).currency, 'DKK');
  })

  it('validates rate correctly', () => {
    assert.throws(() => Tx.create('dividend', {rate: null}), Error);
    assert.throws(() => Tx.create('dividend', {rate: NaN}), Error);
    assert.throws(() => Tx.create('dividend', {rate: undefined}), Error);
    assert.throws(() => Tx.create('dividend', {rate: 0}), Error);
    assert.throws(() => Tx.create('dividend', {rate: -10}), Error);
    assert.throws(() => Tx.create('dividend', {rate: 'XYZ'}), Error);
    assert.throws(() => Tx.create('dividend', {}).rate, Error);

    assert.equal(Tx.create('dividend', {rate: 1.1}).rate, 1.1);
    assert.equal(Tx.create('dividend', {rate: 0.000001}).rate, 0.000001);
  })

  it('validates target correctly', () => {
    assert.throws(() => Tx.create('buy', {target: null}), Error);
    assert.throws(() => Tx.create('buy', {target: NaN}), Error);
    assert.throws(() => Tx.create('buy', {target: undefined}), Error);
    assert.throws(() => Tx.create('buy', {target: -1.0}), Error);
    assert.throws(() => Tx.create('buy', {target: ''}), Error);
    assert.throws(() => Tx.create('buy', {target: '?¤%&/'}), Error);
    assert.throws(() => Tx.create('buy', {target: 'small'}), Error);
    assert.throws(() => Tx.create('buy', {}).target, Error);

    assert.equal(Tx.create('buy', {target: 'BTC'}).target, 'BTC');
    assert.equal(Tx.create('buy', {target: '42'}).target, '42');
    assert.equal(Tx.create('buy', {target: 'DTC**'}).target, 'DTC**');
    assert.equal(Tx.create('buy', {target: '1CR'}).target, '1CR');
  })

  it('validates amount correctly', () => {
    assert.throws(() => Tx.create('sell', {rate: null}), Error);
    assert.throws(() => Tx.create('sell', {rate: NaN}), Error);
    assert.throws(() => Tx.create('sell', {rate: undefined}), Error);
    assert.throws(() => Tx.create('sell', {rate: 0}), Error);
    assert.throws(() => Tx.create('sell', {rate: -10}), Error);
    assert.throws(() => Tx.create('sell', {rate: 'XYZ'}), Error);
    assert.throws(() => Tx.create('sell', {}).rate, Error);

    assert.equal(Tx.create('sell', {rate: 1.1}).rate, 1.1);
    assert.equal(Tx.create('sell', {rate: 0.000001}).rate, 0.000001);
  })

  it('validates fee correctly', () => {
    assert.throws(() => Tx.create('sell', {fee: null}), Error);
    assert.throws(() => Tx.create('sell', {fee: NaN}), Error);
    assert.throws(() => Tx.create('sell', {fee: undefined}), Error);
    assert.throws(() => Tx.create('sell', {fee: -10}), Error);
    assert.throws(() => Tx.create('sell', {fee: 'XYZ'}), Error);

    assert.equal(Tx.create('sell', {fee: 1.1}).fee, 1.1);
    assert.equal(Tx.create('sell', {fee: 0.000001}).fee, 0.000001);
    assert.equal(Tx.create('sell', {fee: 0}).fee, 0);
    assert.equal(Tx.create('sell', {}).fee, 0);
  })

  it('validates tax correctly', () => {
    assert.throws(() => Tx.create('dividend', {tax: null}), Error);
    assert.throws(() => Tx.create('dividend', {tax: NaN}), Error);
    assert.throws(() => Tx.create('dividend', {tax: undefined}), Error);
    assert.throws(() => Tx.create('dividend', {tax: -10}), Error);
    assert.throws(() => Tx.create('dividend', {tax: 'XYZ'}), Error);

    assert.equal(Tx.create('dividend', {tax: 1.1}).tax, 1.1);
    assert.equal(Tx.create('dividend', {tax: 0.000001}).tax, 0.000001);
    assert.equal(Tx.create('dividend', {tax: 0}).tax, 0);
    assert.equal(Tx.create('dividend', {}).tax, 0);
  })

  it('provides correct texts for transactions', () => {

    assert.equal(Tx.create('deposit', {total: 1}).getText(), 'Talletus Service-Z-palveluun');
    assert.equal(Tx.create('withdrawal', {total: 1}).getText(), 'Nosto Service-Z-palvelusta');

    config.set({
      flags: {
        noProfit: true
      }
    });
    assert.equal(Tx.create('buy', {
      target: 'BTC',
      amount: 5/9,
      stock: 2.1,
      avg: 11000,
      total: 11000
    }).getText(), 'Osto +0.55555556 BTC (yht. 2.1 BTC)');
    assert.equal(Tx.create('sell', {
      target: 'BTC',
      amount: -5/9,
      stock: 1.1,
      avg: 11000,
      total: 11000
    }).getText(), 'Myynti -0.55555556 BTC (jälj. 1.1 BTC)');
    config.set({
      flags: {
        noProfit: false
      }
    });
    assert.equal(Tx.create('buy', {
      target: 'BTC',
      amount: 5/9,
      stock: 10.1,
      avg: 11000,
      total: 11000
    }).getText(), 'Osto +0.55555556 BTC (yht. 10.1 BTC, k.h. nyt 11,000.00 €/BTC)');
    assert.equal(Tx.create('sell', {
      target: 'BTC',
      amount: -5/9,
      stock: 1.1,
      avg: 11000,
      total: 11000
    }).getText(), 'Myynti -0.55555556 BTC (k.h. 11,000.00 €/BTC, jälj. 1.1 BTC)');

  })
});
