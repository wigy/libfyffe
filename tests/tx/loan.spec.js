const Tx = require('../../src/tx/Tx');
const config = require('../../src/config');
const assert = require('assert');

describe('sub-entries', () => {

  let tx, sub;

  before(() => {
    config.set({
      currency: 'EUR',
      accounts: {
        bank: 'BANK',
        currencies: {
          eur: 'EUR'
        },
        loans: {
          eur: 'LOAN'
        },
        targets: {
          neo: 'NEO'
        },
        dividends: 'DIV',
        interest: 'INT'
      },
      services: {
        shark: {
          service: 'Loan Shark',
          loanName: 'Sharks Loan'
        }
      }
    });
  });

  it('are able to handle loan', () => {
    tx = Tx.create('buy', {total: 100, amount: 50, target: 'NEO', stock: 100, avg: 2.00});
    sub = Tx.create('loan-take', {total: 100}, 'shark');
    tx.addSubTx(sub);

    assert.equal(tx.getText(), 'Osto +50 NEO (yht. 100 NEO, k.h. nyt 2.00 €/NEO)');
    assert.deepEqual(tx.getEntries(), [
      { number: 'NEO', amount: 100 },
      { number: 'EUR', amount: -100 },
      { number: 'EUR', amount: 100, description: 'Lainanotto: Sharks Loan' },
      { number: 'LOAN', amount: -100, description: 'Lainanotto: Sharks Loan' }
    ]);

    tx = Tx.create('dividend', {total: 50.50, amount: 5, target: 'NEO', given: 0.01});
    sub = Tx.create('loan-pay', {total: 25.25}, 'shark');
    tx.addSubTx(sub);
    assert.equal(tx.getText(), 'Osinko 5 x NEO (osinko 0.01 €)');
  });
});
