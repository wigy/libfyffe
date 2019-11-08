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
        EmptyService: {
        },
        MyService: {
          dummy: 'X',
          accounts: {
            fees: '102',
            targets: {
              eth: '104'
            }
          },
          funds: {
            MyFund: {
              dummy: 'Y',
              accounts: {
                targets: {
                  eth: '304'
                }
              }
            }
          }
        }
      }
    });
    assert.equal(config.get('dummy'), 'Z');
    assert.equal(config.get('dummy', 'MyService'), 'X');
    assert.equal(config.get('dummy', 'MyService', 'MyFund'), 'Y');
    assert.equal(config.get('accounts.fees'), '101');
    assert.equal(config.get('accounts.losses'), '201');
    assert.equal(config.get('accounts.targets.eth'), '103');
    assert.equal(config.get('accounts.fees', 'MyService'), '102');
    assert.equal(config.get('accounts.losses', 'MyService'), '201');
    assert.equal(config.get('accounts.targets.eth', 'MyService'), '104');
    assert.equal(config.get('accounts.fees', 'MyService', 'MyFund'), '102');
    assert.equal(config.get('accounts.losses', 'MyService', 'MyFund'), '201');
    assert.equal(config.get('accounts.targets.eth', 'MyService', 'MyFund'), '304');
    assert.equal(config.get('accounts.fees', 'MyService', 'No such fund'), '102');
    assert.equal(config.get('accounts.losses', 'MyService', 'No such fund'), '201');
    assert.equal(config.get('accounts.targets.eth', 'MyService', 'No such fund'), '104');
    assert.equal(config.get('accounts.fees', 'No such service'), '101');
    assert.equal(config.get('accounts.losses', 'No such service'), '201');
    assert.equal(config.get('accounts.targets.eth', 'No such service'), '103');
    assert.equal(config.get('accounts.fees', 'Empty Service'), '101');
    assert.equal(config.get('accounts.losses', 'Empty Service'), '201');
    assert.equal(config.get('accounts.targets.eth', 'Empty Service'), '103');
    assert.equal(config.get('accounts.fees', 'Empty Service', 'No such fund'), '101');
    assert.equal(config.get('accounts.losses', 'Empty Service', 'No such fund'), '201');
    assert.equal(config.get('accounts.targets.eth', 'Empty Service', 'No such fund'), '103');
    assert.deepEqual(config.getAllAccounts(), { '101': 'fees',
      '102': 'MyService.fees',
      '103': 'targets.eth',
      '104': 'MyService.targets.eth',
      '201': 'losses'
    });
  });
});
