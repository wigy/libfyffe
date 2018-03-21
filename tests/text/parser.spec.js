const Parser = require('../../src/text/Parser');
const config = require('../../src/config');
const assert = require('assert');

describe('class Tx', () => {

  let parser;

  before(() => {
    config.set({
      language: 'fi',
      service: 'My Test Service',
      accounts: {
      },
      tags: {
        'Tag': 'Testing tag'
      }
    });
    parser = new Parser();
  });

  it('can parse transactions from texts', () => {
    let tx;

    // tx = parser.parse('[Tag]Talletus My Test Service-palveluun');
    // tx = parser.parse('[Tag]Nosto My Test Service-palvelusta');
    // tx = parser.parse('Osto +0.55555556 BTC (yht. 2.1 BTC)');
    // tx = parser.parse('Myynti -0.55555556 BTC (jälj. 1.1 BTC)');
    // tx = parser.parse('Osto +0.55555556 BTC (yht. 10.1 BTC, k.h. nyt 11,000.00 €/BTC)');
    // tx = parser.parse('Myynti -0.55555556 BTC (k.h. 11,000.00 €/BTC, jälj. 1.1 BTC)');
    // tx = parser.parse('Osinko 5 x TSLA (kurssi 0.86 $/€)');
    // tx = parser.parse('Osinko 10 x NOKIA');
    // tx = parser.parse('Valuutanvaihto € -> $ (kurssi 0.86 $/€)');
    // tx = parser.parse('My Test Service lainakorko');
    // tx = parser.parse('Siirto My Test Service-palveluun +0.12312312 LTC (yht. 0.22222222 LTC)');

    tx = parser.parse('Siirto My Test Service-palvelusta -0.56756757 LTC (jälj. 0 LTC)');
    console.log(tx);
  });
});
