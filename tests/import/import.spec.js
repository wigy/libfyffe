const fs = require('fs');
const path = require('path');
const knex = require('knex');
const assert = require('assert');
const config = require('../../src/config');
const { tilitintin } = require('../../src/data');
const { fyffe } = require('../../src/core');

const BANK = '1910';
const STOCKS = '1543';
const FEES = '9690';
const INTEREST = '9460';
const PROFITS = '3460';
const DIVIDENDS = '3470';
const EUR = '1920';
const USD = '1929';
const TAX = '9930';

describe('importing', () => {
  let db, period;

  // Helper to summarize balances.
  const balances = async () => tilitintin.data.getPeriodBalances(db, period.id)
    .then((data) => data.balances.reduce((prev, cur) => ({ ...prev, [cur.number]: cur.total }), {}));

  const check = (balances, acc, result) => assert(balances[acc] === Math.round(result * 100), `Incorrect balance ${balances[acc] / 100} for ${acc} - expected ${result}`);

  beforeEach(async () => {
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
        bank: BANK,
        currencies: {
          eur: null,
          usd: null
        },
        targets: {
          default: STOCKS, eth: null, btc: null
        },
        taxes: { source: TAX, income: null, vat: null },
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
        fees: FEES,
        interest: INTEREST,
        imbalance: null,
        losses: null,
        profits: PROFITS,
        dividends: DIVIDENDS
      },
      services: {
        nordnet: {
          'service': 'Nordnet',
          'fund': 'Nordnet Funds',
          accounts: {
            currencies: {
              eur: EUR,
              usd: USD
            }
          }
        }
      }
    });

    // Initialize database.
    const dbPath = path.join(__dirname, '..', '..', 'test.sqlite');
    fs.writeFileSync(dbPath, tilitintin.db.empty());
    db = knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath
      },
      useNullAsDefault: true
    });
    period = await tilitintin.data.createOne(db, 'period', {start_date: '2019-01-01', end_date: '2019-12-31', locked: false});
    tilitintin.tx.add(db, '2019-01-01', 'Initial cash', [
      {number: BANK, amount: 10000},
      {number: '2251', amount: -10000}
    ]);

    // Prepare library.
    fyffe.setDb('test', db);
  });

  it('can import Nordnet correctly', async () => {
    await fyffe.import([path.join(__dirname, 'samples', 'nordnet.csv')], {dbName: 'test'});
    await fyffe.export('tilitintin', {dbName: 'test'});
    const balance = await balances();
    console.log(balance);
    check(balance, BANK, 9600.00);
    check(balance, STOCKS, 0.00);
    check(balance, INTEREST, 1.43);
    check(balance, FEES, 29.90);
    check(balance, TAX, 13.02);
  });

});
