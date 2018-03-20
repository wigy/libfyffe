const regexEscape = require('escape-string-regexp');
const config = require('../config');
const make = require('./make');
const Tx = require('../tx/Tx');

class Matcher {

  constructor() {

  }

  static make(text) {
    console.log(text);
    let regex;
    let n = 1;
    do {
      let match = /^(.*?)([X=C+#$£])\{(\w+|[$])\}(.*)$/.exec(text);
      const [, pre, code, variable, post] = match;
      if (!match) {
        break;
      }
      switch (code) {
        case 'C':
          if (!config[variable]) {
            throw new Error('Configuration variable ' + variable + ' not set.');
          }
          regex = regexEscape(config[variable]);
          break;
        default:
          throw new Error('No handler for text matcher type ' + code + '{..}');
      }
      text = pre + '/TODO/' + post;
      n++;
    } while (true);

    console.log(text);
  }
}

/**
 * A transaction text parser.
 */
class Parser {

  constructor() {
    const catalog = make.catalog();
    const texts = catalog[config.language];
    if (!texts) {
      throw new Error('No text catalog for language ' + config.language);
    }
    Object.keys(texts.tx).forEach((type) => {
      console.log(Matcher.make(texts.tx[type]));
    });
  }

  /**
   * Parse a description text and construct a transaction skeleton based on it.
   * @param {String} text
   */
  parse(text) {

    // Extract tags.
    let tags = [];
    do {
      let match = /^\[([a-zA-Z0-9]+)\]\s*(.*)/.exec(text);
      if (!match) {
        break;
      }
      tags.push(match[1]);
      text = match[2];
    } while (true);
    // TODO: Verify tags.

    // Extract notes.
    let notes = [];
    let sub = /(.*)\((.*)\)(.*)/.exec(text);
    if (sub) {
      text = sub[1] + '()' + sub[3];
      notes = sub[2].split(', ');
    }

//    console.log(tags, text, notes);
  }
}

module.exports = new Parser();
