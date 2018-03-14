const config = require('../../src/config');
const assert = require('assert');

describe('config', () => {

  before(() => {
    config.set({x: 99});
  })

  it('value can be set', () => {
    assert.equal(config.x, 99);
  })
});
