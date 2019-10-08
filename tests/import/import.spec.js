const fs = require('fs');
const path = require('path');
const knex = require('knex');
const config = require('../../src/config');
const { tilitintin } = require('../../src/data');
const { fyffe } = require('../../src/core');

describe('importing', () => {

  before(async () => {
    // Reset DB.
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
        bank: '1910',
        currencies: {
          eur: null,
          usd: null
        },
        targets: {
          default: '1543', eth: null, btc: null
        },
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
        fees: '9690',
        interest: '9460',
        imbalance: null,
        losses: null,
        profits: '3460',
        dividends: null
      },
      services: {
        nordnet: {
          'service': 'Nordnet',
          'fund': 'Nordnet Funds',
          accounts: {
            currencies: {
              eur: '1920',
              usd: null
            }
          }
        }
      }
    });

    // Initialize database.
    const dbPath = path.join(__dirname, '..', '..', 'test.sqlite');
    fs.writeFileSync(dbPath, tilitintin.db.empty());
    const db = knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath
      },
      useNullAsDefault: true
    });
    await tilitintin.data.createOne(db, 'period', {start_date: '2019-01-01', end_date: '2019-12-31', locked: false});

    // Prepare library.
    fyffe.setDb('test', db);
  });

  it('can parse transactions from texts', async () => {
    await fyffe.import(['path-to-nordnet.csv'], {dbName: 'test'});
    console.log('TODO: Test');
  });

});
