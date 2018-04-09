const config = require('../../src/config');
const assert = require('assert');

describe('config', () => {

  before(() => {
    config.set({x: 99});
  });

  it('value can be set', () => {
    assert.equal(config.x, 99);
  });

  it('handles account overriding', () => {
    config.set({
      dummy: 'Z',
      accounts: {
        fees: '101',
        losses: '201',
        targets: {
          eth: '103'
        }
      },
      services: {
        my_service: {
          dummy: 'X',
          accounts: {
            fees: '102',
            targets: {
              eth: '104'
            }
          }
        }
      }
    });
    assert.equal(config.get('dummy'), 'Z');
    assert.equal(config.get('dummy', 'my_service'), 'X');
    assert.equal(config.get('accounts.fees'), '101');
    assert.equal(config.get('accounts.losses'), '201');
    assert.equal(config.get('accounts.targets.eth'), '103');
    assert.equal(config.get('accounts.fees', 'my_service'), '102');
    assert.equal(config.get('accounts.losses', 'my_service'), '201');
    assert.equal(config.get('accounts.targets.eth', 'my_service'), '104');
  });
});
