const parser = require('../../src/text/parser');
const config = require('../../src/config');
const assert = require('assert');

describe('class Tx', () => {

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
    console.log(config);
  });

  it('can parse transactions from texts', () => {
    let tx;

    tx = parser.parse('[Tag]Talletus My Test Service-palveluun');
    tx = parser.parse('[Tag]Nosto Service-Z-palvelusta');
    tx = parser.parse('Osto +0.55555556 BTC (yht. 2.1 BTC)');

    'Myynti -0.55555556 BTC (jälj. 1.1 BTC)';
    'Osto +0.55555556 BTC (yht. 10.1 BTC, k.h. nyt 11,000.00 €/BTC)';
    'Myynti -0.55555556 BTC (k.h. 11,000.00 €/BTC, jälj. 1.1 BTC)';
    'Osinko 5 x TSLA (kurssi 0.86 $/€)';
    'Osinko 10 x NOKIA';
    'Valuutanvaihto € -> $ (kurssi 0.86 $/€)';
    'Valuutanvaihto kr -> $ (kurssi 1.01 $/kr)';
    'Service-Z lainakorko';
    'Siirto Service-Z-palveluun +0.12312312 LTC (yht. 0.22222222 LTC)';
    'Siirto Service-Z-palvelusta -0.56756757 LTC (jälj. 0 LTC)';
  });
});
