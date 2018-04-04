const Tx = require('../../src/tx/Tx');
const config = require('../../src/config');
const assert = require('assert');

describe('entries', () => {

  let tx;

  before(() => {
    config.set({
      currency: 'EUR',
      accounts: {
        bank: 'BANK',
        currencies: {
          eur: 'EUR',
          usd: 'USD',
          dkk: 'DKK'
        },
        targets: {
          eth: 'ETH',
          btc: 'BTC'
        },
        taxes: {
          source: 'SRC',
          income: 'INC'
        },
        fees: 'FEES',
        profits: 'PROF',
        losses: 'LOSS',
        dividends: 'DIV',
        interest: 'INT',
        imbalance: 'IMB'
      }
    });
  });

  it('are correct for deposit', () => {
    tx = Tx.create('deposit', {total: 12});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 12 },
      { number: 'BANK', amount: -12 }
    ]);

    tx = Tx.create('deposit', {total: 1, fee: 0.01});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 0.99 },
      { number: 'FEES', amount: 0.01 },
      { number: 'BANK', amount: -1 }
    ]);
  });

  it('are correct for withdrawal', () => {
    tx = Tx.create('withdrawal', {total: 12});
    assert.deepEqual(tx.getEntries(), [
      { number: 'BANK', amount: 12 },
      { number: 'EUR', amount: -12 }
    ]);
    tx = Tx.create('withdrawal', {total: 12, fee: 1});
    assert.deepEqual(tx.getEntries(), [
      { number: 'BANK', amount: 11 },
      { number: 'FEES', amount: 1 },
      { number: 'EUR', amount: -12 }
    ]);
  });

  it('are correct for buy', () => {
    tx = Tx.create('buy', {total: 10.001, target: 'ETH'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'ETH', amount: 10 },
      { number: 'EUR', amount: -10 }
    ]);
    tx = Tx.create('buy', {total: 10.001, fee: 0.01, target: 'ETH'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'ETH', amount: 9.99 },
      { number: 'FEES', amount: 0.01 },
      { number: 'EUR', amount: -10 }
    ]);
  });

  it('are correct for sell', () => {
    tx = Tx.create('sell', {total: 1200.00, target: 'ETH', amount: -2.0, avg: 500.00});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 1200 },
      { number: 'PROF', amount: -200 },
      { number: 'ETH', amount: -1000 }
    ]);
    tx = Tx.create('sell', {total: 900.00, target: 'ETH', amount: -2.0, avg: 500.00});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 900 },
      { number: 'LOSS', amount: 100 },
      { number: 'ETH', amount: -1000 }
    ]);
    tx = Tx.create('sell', {total: 1000.00, target: 'ETH', amount: -2.0, avg: 500.00});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 1000 },
      { number: 'ETH', amount: -1000 }
    ]);
    tx = Tx.create('sell', {total: 1200.00, target: 'ETH', amount: -2.0, fee: 10.0, avg: 500.00});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 1190 },
      { number: 'FEES', amount: 10 },
      { number: 'PROF', amount: -200 },
      { number: 'ETH', amount: -1000 }
    ]);
    tx = Tx.create('sell', {total: 900.00, target: 'ETH', amount: -2.0, fee: 10.0, avg: 500.00});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 890 },
      { number: 'FEES', amount: 10 },
      { number: 'LOSS', amount: 100 },
      { number: 'ETH', amount: -1000 }
    ]);
    tx = Tx.create('sell', {total: 1000.00, target: 'ETH', amount: -2.0, fee: 10.0, avg: 500.00});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 990 },
      { number: 'FEES', amount: 10 },
      { number: 'ETH', amount: -1000 }
    ]);
  });

  it('are correct for dividend', () => {
    tx = Tx.create('dividend', {total: 5.5, currency: 'USD'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'DIV', amount: -5.5 },
      { number: 'USD', amount: 5.5 }
    ]);
    tx = Tx.create('dividend', {total: 5.5, currency: 'USD', tax: 0.5});
    assert.deepEqual(tx.getEntries(), [
      { number: 'DIV', amount: -5.5 },
      { number: 'USD', amount: 5 },
      { number: 'SRC', amount: 0.5 }
    ]);
    tx = Tx.create('dividend', {total: 5.5});
    assert.deepEqual(tx.getEntries(), [
      { number: 'DIV', amount: -5.5 },
      { number: 'EUR', amount: 5.5 }
    ]);
    tx = Tx.create('dividend', {total: 5.5, tax: 0.5});
    assert.deepEqual(tx.getEntries(), [
      { number: 'DIV', amount: -5.5 },
      { number: 'EUR', amount: 5 },
      { number: 'INC', amount: 0.5 }
    ]);
  });

  it('are correct for fx', () => {
    tx = Tx.create('fx-in', {total: 5, target: 'USD'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'USD', amount: 5 },
      { number: 'EUR', amount: -5 }
    ]);
    tx = Tx.create('fx-out', {total: 1, target: 'USD'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: 1 },
      { number: 'USD', amount: -1 }
    ]);
    tx = Tx.create('fx-in', {total: 5, currency: 'DKK', target: 'USD'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'USD', amount: 5 },
      { number: 'DKK', amount: -5 }
    ]);
    tx = Tx.create('fx-out', {total: 1, currency: 'DKK', target: 'USD'});
    assert.deepEqual(tx.getEntries(), [
      { number: 'DKK', amount: 1 },
      { number: 'USD', amount: -1 }
    ]);
  });

  it('are correct for interest', () => {
    tx = Tx.create('interest', {total: 500});
    assert.deepEqual(tx.getEntries(), [
      { number: 'EUR', amount: -500 },
      { number: 'INT', amount: 500 }
    ]);
  });

  it('are correct for moving', () => {
    tx = Tx.create('move-in', {total: 1900.00, target: 'BTC', amount: 0.05});
    assert.deepEqual(tx.getEntries(), [
      { number: 'BTC', amount: 1900 },
      { number: 'IMB', amount: -1900 }
    ]);
    tx = Tx.create('move-out', {total: 1900.00, target: 'BTC', amount: -0.05});
    assert.deepEqual(tx.getEntries(), [
      { number: 'BTC', amount: -1900 },
      { number: 'IMB', amount: 1900 }
    ]);
  });
});
