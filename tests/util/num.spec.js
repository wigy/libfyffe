const assert = require('assert');
const num = require('../../src/util/num');

describe('num', () => {
  it('converts numbers to text', () => {
    assert.equal(num.trim(12, 'FOO'), '12 FOO');
    assert.equal(num.trim(0, 'FOO'), '0 FOO');
    assert.equal(num.trim(-12, 'FOO'), '-12 FOO');
    assert.equal(num.trim(100000, 'FOO'), '100000 FOO');
    assert.equal(num.trim(1/9, 'FOO'), '0.11111111 FOO');
  })

  it('converts signed numbers to text', () => {
    assert.equal(num.trimSigned(12, 'FOO'), '+12 FOO');
    assert.equal(num.trimSigned(0, 'FOO'), '+0 FOO');
    assert.equal(num.trimSigned(-12, 'FOO'), '-12 FOO');
    assert.equal(num.trimSigned(100000, 'FOO'), '+100000 FOO');
    assert.equal(num.trimSigned(1/9, 'FOO'), '+0.11111111 FOO');
  })

  it('converts currency to text', () => {
    assert.equal(num.currency(12, 'FOO'), '12.00 FOO');
    assert.equal(num.currency(0, 'FOO'), '0.00 FOO');
    assert.equal(num.currency(-12, 'FOO'), '-12.00 FOO');
    assert.equal(num.currency(100000, 'FOO'), '100,000.00 FOO');
    assert.equal(num.currency(1/9, 'FOO'), '0.11 FOO');
  })
});
