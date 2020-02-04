const fs = require('fs');
const csv = require('csvtojson');
const clone = require('clone');

/**
 * Read in CSV file.
 * @param {String} pathOrString
 * @param {Object} options
 * @param {String} options.delimiter         Column seprator (default: ',')
 * @param {String} options.eol               End of line sequence (default: \n)
 * @param {Number} options.cutFromBeginning  Drop this many lines from the beginning.
 * @param {Boolean} options.noheader         Skip header reading.
 * @param {String[]} options.headers         Explicit list of headers.
 * @param {Boolean} options.lineNumbers      If set, add `__lineNumber` field counting 1..n.
 * @param {String} options.output            'csv' as rows as arrays or 'json' as rows as objects.
 * @param {Boolean} options.dropEmpty        Drop entries if no data.
 */
async function read(pathOrString, options = {}) {
  return new Promise((resolve, reject) => {

    let headers = null;
    options = clone(options);
    options.noheader = true;

    const lines = [];

    csv(options)
      .fromString(options.fromString ? pathOrString : fs.readFileSync(pathOrString))
      .on('csv', (row) => {
        if (options.cutFromBeginning) {
          options.cutFromBeginning--;
        } else if (headers === null) {
          headers = options.headers || row.map(r => r.replace(/\W/g, '_'));
          headers = headers.map((header, i) => header || 'Column' + (i + 1));
        } else {
          if (options.dropEmpty && !row.length) {
            return;
          }
          if (options.output === 'csv') {
            lines.push(row);
            return;
          }
          const line = {};
          for (let i = 0; i < row.length; i++) {
            line[headers[i]] = row[i];
          }
          if (options.lineNumbers) {
            line.__lineNumber = lines.length + 1;
          }
          lines.push(line);
        }
      })
      .on('done', () => {
        resolve(lines);
      });
  });
}

async function readString(str, options) {
  return read(str, { ...options, fromString: true });
}

module.exports = {
  read,
  readString
};
