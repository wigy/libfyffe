const fs = require('fs');
const path = require('path');
const knex = require('knex');
const config = require('../../src/config');
const { tilitintin } = require('../../src/data');

describe('importing', () => {

  before(async () => {
    config.set({
      currency: 'EUR',
      language: 'fi',
      service: null,
      fund: null,
      loanName: null,
      tags: {},
      flags: {
        noProfit: false,
        tradeProfit: false,
        dryRun: false,
        debug: false,
        zeroMoves: false,
        force: false,
        skipErrors: false,
        importErrors: false,
        stopOnError: false,
        addCurrencies: false
      },
      accounts: {
        bank: null,
        currencies: { eur: null, usd: null },
        targets: { default: null, eth: null, btc: null },
        taxes: { source: null, income: null, vat: null },
        loans: { eur: null },
        expenses: {
          'gov-fees': null,
          bank: null,
          misc: null,
          misc1: null,
          misc2: null,
          misc3: null,
          misc4: null,
          misc5: null,
          computer: null,
          software: null,
          transfer: null,
          transfer2: null,
          transfer3: null,
          transfer4: null,
          transfer5: null,
          vat: null
        },
        incomes: {
          invest: null,
          invest2: null,
          misc: null,
          misc1: null,
          misc2: null,
          misc3: null,
          misc4: null,
          misc5: null,
          sales: null,
          sales2: null,
          sales3: null,
          sales4: null,
          sales5: null,
          transfer: null,
          transfer2: null,
          transfer3: null,
          transfer4: null,
          transfer5: null
        },
        fees: null,
        interest: null,
        imbalance: null,
        losses: null,
        profits: null,
        dividends: null
      },
      services: {}
    });

    const dbPath = path.join(__dirname, '..', '..', 'test.sqlite');
    knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath
      },
      useNullAsDefault: true
    });

    fs.writeFileSync(dbPath, tilitintin.db.empty());
  });

  it('can parse transactions from texts', () => {
    console.log('OK');
  });

});
