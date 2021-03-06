const currency = require('../data/currency');
const config = require('../config');
const num = require('../util/num');

// Translation table.
const texts = {
  fi: require('../../data/texts/fi.json')
};

/**
 * Helper to substitute variables in to the translated text.
 * @param {String|null} text
 * @param {any} target
 * @return {String|null}
 *
 * Special notations in the text are handled according to the following:
 * * C{var} - Variable value is taken from the library configuration for the tx-service.
 * * ={var} - Variable value is taken from the target object as is.
 * * +{var} - Variable value is taken from the target and transformed to signed decimal.
 * * #{var} - Variable value is taken from the target and transformed to decimal.
 * * ${var} - Variable value is taken from the target and transformed to currency.
 * * £{var} - Variable value is replaced with the corresponding currency symbol.
 * * X{$} - Replace with currency symbol of configured currency.
 */
function substitute(text, target) {
  let match;
  let ret = text;

  if (text === null) {
    return null;
  }

  // Replace special symbols.
  let regex = /X\{([$])\}/;
  while ((match = regex.exec(ret))) {
    ret = ret.replace(regex, currency.text2sym(config.currency) || config.currency);
  }

  // Replace configuration variables.
  regex = /C\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    if (!target.service) {
      throw new Error('Cannot translate transaction ' + JSON.stringify(target.toJSON()) + ' without service.');
    }
    const variable = match[1];
    const conf = config.services[target.service];
    conf.service = target.service;
    conf.fund = target.fund;
    if (conf[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since `' + variable + '` not configured for `' + target.service + '`.');
    }
    ret = ret.replace(regex, conf[variable]);
  }

  // Replace variables with signed number.
  regex = /\+\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    const variable = match[1];
    if (target[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since variable `' + variable + '` not found from target.');
    }
    ret = ret.replace(regex, num.trimSigned(target[variable]));
  }

  // Replace variables with fixed decimal number.
  regex = /#\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    const variable = match[1];
    if (target[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since variable `' + variable + '` not found from target.');
    }
    ret = ret.replace(regex, num.trim(target[variable]));
  }

  // Replace variables with currency.
  regex = /\$\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    const variable = match[1];
    if (target[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since variable `' + variable + '` not found from target.');
    }
    ret = ret.replace(regex, num.currency(target[variable]));
  }

  // Replace variables with currency symbol.
  regex = /£\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    const variable = match[1];
    if (target[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since variable `' + variable + '` not found from target.');
    }
    const sym = currency.text2sym(target[variable]) || target[variable];
    ret = ret.replace(regex, sym);
  }

  // Replace variables as they are.
  regex = /=\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    const variable = match[1];
    if (target[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since variable `' + variable + '` not found from target.');
    }
    ret = ret.replace(regex, target[variable]);
  }

  return ret;
}

module.exports = {

  /**
   * Construct a text describing a transaction.
   * @param {Tx} tx Transaction to describe.
   */
  tx: (tx, key = tx.type) => {
    const text = texts[config.language].tx[key];
    if (text === undefined) {
      throw new Error('No translation for transaction ' + JSON.stringify(key) + ' in ' + config.language);
    }
    return substitute(text, tx);
  },

  /**
   * Construct an optional text for the transaction.
   */
  option: (name, tx) => {
    let key = tx.type;
    let text = texts[config.language].options[key];
    if (text === undefined && tx.has('target')) {
      key += '.' + tx.target.toLowerCase();
      text = texts[config.language].options[key];
    }
    if (text === undefined) {
      throw new Error('Cannot find any option definitions for tx ' + key + ': ' + JSON.stringify(tx));
    }
    text = text[name];
    if (text === undefined) {
      throw new Error('No translation for option ' + JSON.stringify(name) + ' in language ' + config.language + ' for type ' + JSON.stringify(key));
    }
    return substitute(text, tx);
  },

  /**
   * Construct a text with main body and optional additions.
   */
  withOptions: (body, opts) => {
    let ret = body;

    opts = opts.filter(o => o !== null);

    if (!opts.length) {
      return ret;
    }

    if (ret === '') {
      ret = opts.join(', ');
    } else {
      if (opts.join(', ') !== '') {
        ret += ' (' + opts.join(', ') + ')';
      }
    }

    return ret;
  },

  /**
   * Get the text catalog.
   */
  catalog: () => texts
};
