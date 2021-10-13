const Import = require('../import');

class NordeaImport extends Import {

  constructor() {
    super('OP');
  }

  // Helper to convert string amount to float value.
  num(str) {
    return parseFloat(str.replace(',', '.').replace(/ /g, ''));
  }

  isMine(content) {
    if (/^\s*"Kirjauspäivä";"Arvopäivä";"Määrä EUROA";/.test(content)) {
      return true
    }
    return /^Kirjauspäivä;Arvopäivä;Määrä  EUROA;/.test(content);
  }

  load(file) {
    return this.loadCSV(file, { delimiter: ';' });
  }

  grouping(entries) {
    return entries.map(entry => [entry]);
  }

  id(group) {
    return this.service + ':' + this.fund + ':' + group[0].Arkistointitunnus;
  }

  time(entry) {
    const match = /(\d+)\.(\d+)\.(\d+)/.exec(entry.Kirjausp_iv_);
    const stamp = match[3] + '-' + match[2] + '-' + match[1] + 'T12:00:00.000Z';
    return new Date(stamp).getTime();
  }

  rawValue(group) {
    if (group.length > 1) {
      throw new Error('Only single entry raw values supported.');
    }
    return this.num(group[0].M__r___EUROA);
  }
}

module.exports = new NordeaImport();
