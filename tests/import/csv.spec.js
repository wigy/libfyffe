const { csv } = require('../../src/data');
const path = require('path');
const assert = require('assert');

describe('CSV reader', () => {
  it('can read basic file', async () => {
    const data = await csv.read(path.join(__dirname, 'samples', 'basic.csv'));
    assert.deepStrictEqual(data, [
      { Name: 'Joe', Value: '1' },
      { Name: 'Dude', Value: '2' }
    ]);
  });

  it('can read basic file as an array', async () => {
    const data = await csv.read(path.join(__dirname, 'samples', 'basic.csv'), {
      output: 'csv'
    });
    assert.deepStrictEqual(data, [
      ['Joe', '1'],
      ['Dude', '2']
    ]);
  });

  it('can read special file', async () => {
    const data = await csv.read(path.join(__dirname, 'samples', 'special.csv'), {
      delimiter: ';',
      headers: ['Head', 'Count']
    });
    assert.deepStrictEqual(data, [
      { Head: 'A', Count: '1' },
      { Head: 'B', Count: '2' },
      { Head: 'C', Count: '3' }
    ]);
  });

  it('can read special file as an array', async () => {
    const data = await csv.read(path.join(__dirname, 'samples', 'special.csv'), {
      delimiter: ';',
      output: 'csv'
    });
    assert.deepStrictEqual(data, [
      ['A', '1'],
      ['B', '2'],
      ['C', '3']
    ]);
  });

  it('can read messy file', async () => {
    const data = await csv.read(path.join(__dirname, 'samples', 'nordnet.csv'), {
      delimiter: ';',
      dropEmpty: true
    });
    assert.strictEqual(data.length, 6);
    assert.deepStrictEqual(data[0], {
      Id: '574258941',
      Kirjausp_iv_: '2019-01-01',
      Kauppap_iv_: '2019-01-01',
      Maksup_iv_: '2019-01-03',
      Tapahtumatyyppi: 'TALLETUS',
      Arvopaperi: '',
      Instrumenttyp: '',
      ISIN: '',
      M__r_: '0',
      Kurssi: '0,00',
      Korko: '0,0000',
      Maksut: '0,00',
      Summa: '400,00',
      Valuutta: 'EUR',
      hankinta_arvo: '0,00',
      Tulos: '0,00',
      Kokonaism__r_: '0,00',
      Saldo: '-1 599,08',
      Valuuttakurssi: '1,00',
      Tapahtumateksti: 'TALLETUS REAL-TIME',
      Mit_t_intip_iv_: '',
      Vahvistusnumero_Laskelma: '900536218'
    });
    assert.deepStrictEqual(data[5], {
      Id: '570650102',
      Kirjausp_iv_: '2019-06-11',
      Kauppap_iv_: '2019-06-11',
      Maksup_iv_: '2019-06-13',
      Tapahtumatyyppi: 'OSTO',
      Arvopaperi: 'BRG',
      Instrumenttyp: 'Instrumentti',
      ISIN: 'US09627J1025',
      M__r_: '600',
      Kurssi: '11,51',
      Korko: '0,0000',
      Maksut: '16,97',
      Summa: '-6 922,97',
      Valuutta: 'USD',
      hankinta_arvo: '6 922,97',
      Tulos: '0,00',
      Kokonaism__r_: '600,00',
      Saldo: '-16,97',
      Valuuttakurssi: '0,88',
      Tapahtumateksti: '',
      Mit_t_intip_iv_: '',
      Vahvistusnumero_Laskelma: '625962413'
    });
  });
});
