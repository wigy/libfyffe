const fs = require('fs');
const csv = require('csvtojson');
const path = require('path');

/**
 * Base class for importing data.
 */
class Import {

  /**
   * Read in the data from the file and store it internally.
   * @param {String} file A path to the file.
   * @return {Promise<any>} Promise resolving to the parsed data.
   */
  async load(file) {
    throw new Error('Importer does not implement load().');
  }

  /**
   * Load a list of files.
   * @param {Array<String>} files
   */
  async loadFiles(files) {
    return Promise.all(files.map((file) => this.load(file)))
      .then((data) => data.reduce((prev, cur) => prev.concat(cur), []));
  }

  /**
   * A loader for CSV file.
   *
   * @param {String} file A path to the file.
   * @param {Object} opts Options for CSV-reader.
   * @return {Promise<Array<Object>>}
   *
   * The first row is assumed to have headers and they are used to construct
   * an array of objects containing each row as members defined by the first header row.
   * Special option `headers` can be given as an explicit list of headers.
   */
  async loadCSV(file, opts = {}) {
    this.file = file;
    return new Promise((resolve, reject) => {

      let headers = null;
      opts.noheader = true;

      fs.readFile(file, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        data = data.toString();
        let lines = [];

        csv(opts)
          .fromString(data)
          .on('csv', (row) => {
            if (headers === null) {
              headers = opts.headers || row.map(r => r.replace(/\W/g, '_'));
            } else {
              let line = {};
              for (let i = 0; i < row.length; i++) {
                line[headers[i]] = row[i];
              }
              line.__lineNumber = lines.length + 1;
              lines.push(line);
            }
          })
          .on('done', () => {
            resolve(lines);
          });
      });
    });
  }

  /**
   * Generate unique transaction ID.
   * @param {Array<Object>} group
   */
  id(group) {
    throw new Error('Importer does not implement id().');
  }

  /**
   * Fallback ID if nothing better available for identifying transactions.
   */
  fileAndLineId(group) {
    let id = path.basename(this.file);
    id += ':';
    id += group.map((group) => group.__lineNumber).sort((a, b) => a - b).join(',');
    return id;
  }

  /**
   * Split input data to groups and generate IDs.
   * @param {Array<any>} entries
   * @return {Promise<Array<Array<any>>>}
   */
  makeGrouping(entries) {
    let groups = this.grouping(entries);
    // Generate IDs.
    groups.forEach((group, i) => {
      const id = this.id(group);
      if (id === null || id === undefined || /undefined/.test(id)) {
        throw new Error('Invalid ID ' + JSON.stringify(id) + ' generated for a group ' + JSON.stringify(group));
      }
      group.id = id + '';
    });
    return groups;
  }

}

module.exports = Import;
