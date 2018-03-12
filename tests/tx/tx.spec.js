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

  it('validates members', () => {
    assert.throws(() => Tx.create('deposit', {total: null}), Error);
    assert.throws(() => Tx.create('deposit', {total: NaN}), Error);
    assert.throws(() => Tx.create('deposit', {total: undefined}), Error);
    assert.throws(() => Tx.create('deposit', {total: -1.0}), Error);

    assert.throws(() => Tx.create('deposit', {}).total, Error);
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
