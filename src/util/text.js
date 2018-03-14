const getSymbolFromCurrency = require('currency-symbol-map');
const config = require('../config');
const num = require('./num');

// Translation table.
const texts = {
  fi: require('../../data/texts/fi.json')
};

/**
 * Helper to substitute variables in to the translated text.
 * @param {String} text
 * @param {any} target
 *
 * Special notations in the text are handled according to the following:
 * * C{var} - Variable value is taken from the library configuration.
 * *  {var} - Variable value is taken from the target object as is.
 * * +{var} - Variable value is taken from the target and transformed to signed decimal.
 * * #{var} - Variable value is taken from the target and transformed to decimal.
 * * ${var} - Variable value is taken from the target and transformed to currency.
 * * £{var} - Variable value is replaced with the corresponding currency symbol.
 * *  {$} - Replace with currency symbol of configured currency.
 *
 */
function substitute(text, target) {
  let match;
  let ret = text;

  // Replace special symbols.
  let regex = /\{([$])\}/;
  while ((match = regex.exec(ret))) {
    ret = ret.replace(regex, getSymbolFromCurrency(config.currency) || config.currency);
  }

  // Replace configuration variables.
  regex = /C\{(\w+)\}/;
  while ((match = regex.exec(ret))) {
    const variable = match[1];
    if (config[variable] === undefined) {
      throw new Error('Cannot translate text ' + JSON.stringify(text) + ' since `' + variable + '` not configured.');
    }
    ret = ret.replace(regex, config[variable]);
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
    const sym = getSymbolFromCurrency(target[variable]) || target[variable];
    ret = ret.replace(regex, sym);
  }

  // Replace variables as they are.
  regex = /\{(\w+)\}/;
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
  tx: (tx) => {
    const key = tx.type;
    let text = texts[config.language].tx[key];
    if (!text) {
      throw new Error('No translation for transaction ' + JSON.stringify(key) + ' in ' + config.language);
    }
    return substitute(text, tx);
  },

  /**
   * Construct an optional text for the transaction.
   */
  option: (name, tx) => {
    let text = texts[config.language].options[name];
    if (!text) {
      throw new Error('No translation for option ' + JSON.stringify(name) + ' in ' + config.language);
    }
    return substitute(text, tx);
  },

  /**
   * Construct a text with main body and optional additions.
   */
  withOptions: (body, opts) => {
    let ret = body;
    if (opts.length) {
      ret += ' (' + opts.join(', ') + ')';
    }
    return ret;
  }
};
