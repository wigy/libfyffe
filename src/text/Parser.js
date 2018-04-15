const currency = require('../data/currency');
const regexEscape = require('escape-string-regexp');
const config = require('../config');
const make = require('./make');
const Tx = require('../tx/Tx');

/**
 * A class for holding regex for reconstructing a transaction.
 */
class Matcher {

  constructor(type = null) {
    this.type = type;
    this.matcher = null;
    this.regex = [];
    this.variables = [];
    this.conversions = [];
  }

  /**
   * Add a sub-expression.
   * @param {String} regex
   */
  addRegex(regex, variable = null, conversion = (i) => i) {
    this.regex.push('(' + regex + ')');
    this.variables.push(variable);
    this.conversions.push(conversion);
  }

  /**
   * Convert all /<num>/ notations to the sub-expressions and set up the overall regex.
   * @param {String} text
   */
  setText(text) {
    for (let i = 0; i < this.regex.length; i++) {
      text = text.replace('/' + i + '/', this.regex[i]);
    }
    this.matcher = new RegExp('^' + text + '$');
  }

  /**
   * Check if text matches to this matcher and construct object of matching sub-expressions if it does.
   * @param {String} text
   * @return {null|Object}
   */
  exec(text) {
    const match = this.matcher.exec(text);
    if (!match) {
      return null;
    }
    let ret = {};
    for (let n = 0; n < this.regex.length; n++) {
      if (this.variables[n] !== null) {
        ret[this.variables[n]] = this.conversions[n](match[n + 1]);
      }
    }
    return ret;
  }

  /**
   * Construct a matcher based on the original text construction rule provided by language file.
   * @param {String} type
   * @param {String} text
   */
  static make(type, text) {
    let ret = new Matcher(type);
    let n = 0;
    do {
      let match = /^(.*?)([X=C+#$£])\{(\w+|[$])\}(.*)$/.exec(text);
      if (!match) {
        break;
      }
      const [, pre, code, variable, post] = match;
      switch (code) {
        case 'C':
          if (!config[variable]) {
            ret.addRegex('.+?');
          } else {
            ret.addRegex(regexEscape(config[variable]));
          }
          break;
        case '+':
          ret.addRegex('[-+][0-9.]+', variable, (num) => parseFloat(num));
          break;
        case '#':
          ret.addRegex('[0-9.]+', variable, (num) => parseFloat(num));
          break;
        case '$':
          ret.addRegex('-?[0-9.,]+', variable, (num) => parseFloat(num.replace(/,/g, '')));
          break;
        case '=':
          ret.addRegex('.+?', variable);
          break;
        case '£':
          ret.addRegex('.+?', variable, (sym) => currency.sym2text(sym));
          break;
        case 'X':
          if (variable === '$') {
            ret.addRegex(regexEscape(currency.text2sym(config.currency)));
          } else {
            throw new Error('No handler for special markup X{' + variable + '}');
          }
          break;
        default:
          throw new Error('No handler for text matcher type ' + code + '{..}');
      }
      text = pre + '/' + n + '/' + post;
      n++;
    } while (true);

    ret.setText(text);

    return ret;
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
    this.typeMatch = [];
    Object.keys(texts.tx).forEach((type) => {
      this.typeMatch.push(Matcher.make(type, texts.tx[type]));
    });
    this.optionMatch = [];
    Object.keys(texts.options).forEach((type) => {
      this.optionMatch.push(Matcher.make(type, texts.options[type]));
    });
    this.tagOfService = {};
    Object.keys(config.services).forEach((service) => {
      const tag = config.getTag(config.getServiceName(service));
      if (tag) {
        this.tagOfService[tag.tag] = service;
      }
    });
  }

  /**
   * Parse a description text and construct a transaction skeleton based on it.
   * @param {String} text
   */
  parse(text) {
    const orig = text;

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

    // Verify tags and find the service.
    let service = null;
    tags.forEach((tag) => {
      if (!config.tags[tag]) {
        throw new Error('Invalid tag ' + JSON.stringify(tag) + ' in ' + JSON.stringify(orig));
      }
      if (this.tagOfService[tag]) {
        service = this.tagOfService[tag];
      }
    });

    // Extract notes.
    let notes = [];
    let sub = /(.*)\((.*)\)$/.exec(text);
    if (sub) {
      text = sub[1].trim();
      notes = sub[2].split(', ');
    }

    // Find matching transaction and construct data for it.
    let type = null;
    let data = null;
    for (let i = 0; i < this.typeMatch.length; i++) {
      data = this.typeMatch[i].exec(text);
      if (data) {
        type = this.typeMatch[i].type;
        let opt;
        for (let j = 0; j < notes.length; j++) {
          let k = 0;
          while (k < this.optionMatch.length) {
            opt = this.optionMatch[k].exec(notes[j]);
            if (opt) {
              data = Object.assign(data, opt);
              break;
            }
            k++;
          }
          if (k === this.optionMatch.length) {
            throw new Error('Failed to parse option: ' + notes[j] + ' in ' + JSON.stringify(orig));
          }
        }
        break;
      }
    }
    // Construct the transaction.
    if (!type) {
      throw new Error('Failed to parse ' + JSON.stringify(orig));
    }
    let ret = Tx.create(type, data);
    ret.tags = tags;
    ret.service = service;
    return ret;
  }
}

module.exports = Parser;
