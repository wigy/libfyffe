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
    assert.equal(Tx.create('fx-in', {currency: 'DKK'}).currency, 'DKK');
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
