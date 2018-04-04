const config = require('../../src/config');
const assert = require('assert');

describe('core', () => {

  let fyffe;

  before(() => {
    config.set({});
    fyffe = require('../../src/core/fyffe');
  });

  it('stock operates as usual', () => {
    assert.equal(fyffe.stock.getStock('ETH'), 0);
    fyffe.stock.add(4, 'ETH');
    fyffe.stock.del(0.5, 'ETH');
    assert.equal(fyffe.stock.getStock('ETH'), 3.5);
  });
});
