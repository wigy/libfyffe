const Tx = require('../../src/tx/Tx');
const config = require('../../src/config');
const assert = require('assert');

describe('class Tx', () => {
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
    assert.throws(() => Tx.create('fx-in', {}).currency, Error);

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
});

describe('config', () => {

  before(() => {
    config.set({x: 99});
  })

  it('value can be set', () => {
    assert.equal(config.x, 99);
  })
});
