const Import = require('../import');

class NordeaImport extends Import {

  constructor() {
    super('Nordea');
  }

  isMine(content) {
    return /^Tilinumero\t/.test(content);
  }

  load(file) {
    return this.loadCSV(file, {delimiter: '\t', eol: '\n\r\n', cutFromBeginning: 1});
  }

  grouping(entries) {
    return entries.map(entry => [entry]);
  }

  id(group) {
    return (group[0].Saaja_Maksaja.replace(/\s/g, '_') + '/' + (group[0].Viite || group[0].Maksajan_viite).replace(/\s/g, '')).toUpperCase();
  }

  time(entry) {
    const match = /(\d+)\.(\d+)\.(\d+)/.exec(entry.Maksup_iv_);
    const stamp = match[3] + '-' + match[2] + '-' + match[1] + 'T12:00:00.000Z';
    return new Date(stamp).getTime();
  }

  recognize(group) {
    return this.mapper.findMatch('recognize', group[0]);
  }
}

module.exports = new NordeaImport();
