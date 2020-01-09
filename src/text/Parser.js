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
    const ret = {};
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
    const ret = new Matcher(type);
    let n = 0;
    do {
      const match = /^(.*?)([X=C+#$£])\{(\w+|[$])\}(.*)$/.exec(text);
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
    this.optionMatch = {};
    Object.keys(texts.options).forEach((type) => {
      if (texts.options[type] === null) {
        return;
      }
      // Array is multiple option possibilities.
      this.optionMatch[type] = {};
      Object.keys(texts.options[type]).forEach((name) => {
        this.optionMatch[type][name] = Matcher.make(type, texts.options[type][name]);
      });
    });

    this.tagToService = {};
    this.tagToFund = {};
    const services = Object.keys(config.services);
    for (let i = 0; i < services.length; i++) {
      if (services[i] === 'funds') {
        const funds = Object.keys(config.services[services[i]]);
        for (let j = 0; j < funds.length; j++) {
          const tag = config.getTag(funds[j]);
          if (tag) {
            this.tagToFund[tag.tag] = funds[j];
          }
        }
        continue;
      }
      const tag = config.getTag(services[i]);
      if (tag) {
        this.tagToService[tag.tag] = services[i];
      }
      if (config.services[services[i]].funds) {
        const funds = Object.keys(config.services[services[i]].funds);
        for (let j = 0; j < funds.length; j++) {
          const tag = config.getTag(funds[j]);
          if (tag) {
            this.tagToFund[tag.tag] = funds[j];
          }
        }
      }
    }
  }

  /**
   * Find the service name for the given tags.
   * @param {String[]} tags
   */
  findService(tags) {
    for (let i = 0; i < tags.length; i++) {
      if (this.tagToService[tags[i]]) {
        return this.tagToService[tags[i]];
      }
    }
    return null;
  }

  /**
   * Find the fund name for the given tags.
   * @param {String[]} tags
   */
  findFund(tags) {
    for (let i = 0; i < tags.length; i++) {
      if (this.tagToFund[tags[i]]) {
        return this.tagToFund[tags[i]];
      }
    }
    return null;
  }

  /**
   * Parse a description text and construct a transaction skeleton based on it.
   * @param {String} text
   */
  parse(text) {
    const orig = text;
    // Drop additional currency valuation.
    if (/ \| [-0-9,. ]+ /.test(text)) {
      text = text.replace(/ \| [-0-9,. ]+ .*/, '');
    }

    // Extract tags.
    const tags = [];
    do {
      const match = /^\[([a-zA-Z0-9]+)\]\s*(.*)/.exec(text);
      if (!match) {
        break;
      }
      tags.push(match[1]);
      text = match[2];
    } while (true);

    // Verify tags and find the service and fund.
    let service = null;
    let fund = null;
    tags.forEach((tag) => {
      if (!config.tags[tag]) {
        throw new Error('Invalid tag ' + JSON.stringify(tag) + ' in ' + JSON.stringify(orig));
      }
    });
    service = this.findService(tags);
    fund = this.findFund(tags);

    // Extract options.
    let options = [];
    const sub = /(.*)\((.*)\)$/.exec(text);
    if (sub) {
      text = sub[1].trim();
      options = sub[2].split(', ');
    }

    // Find matching transaction and construct data for it.
    let type = null;
    let data = null;
    for (let i = 0; i < this.typeMatch.length; i++) {
      data = this.typeMatch[i].exec(text);
      if (data) {
        type = this.typeMatch[i].type;
        for (let j = 0; j < options.length; j++) {
          if (!this.optionMatch[type]) {
            throw new Error('No options defined for type ' + JSON.stringify(type));
          }
          let k = 0;
          const optionTypes = Object.keys(this.optionMatch[type]);
          while (k < optionTypes.length) {
            const opt = this.optionMatch[type][optionTypes[k]].exec(options[j]);
            if (opt) {
              data = Object.assign(data, opt);
              break;
            }
            k++;
          }
          if (k === optionTypes.length) {
            throw new Error('Failed to parse option: "' + options[j] + '" in ' + JSON.stringify(orig));
          }
        }
        break;
      }
    }
    // Construct the transaction.
    if (!type) {
      throw new Error('Failed to parse ' + JSON.stringify(orig));
    }
    const ret = Tx.create(type, data);
    ret.tags = tags;
    ret.service = service;
    ret.fund = fund;

    return ret;
  }
}

module.exports = Parser;
