module.exports = {
  /**
   * Check that the value fulfills the validator function.
   * @param {String} name
   * @param {any} val
   * @param {Function} fn
   */
  check: (name, val, fn) => {
    if (!fn(val)) {
      throw new Error('Value ' + val + ' is not legal for ' + JSON.stringify(name));
    }
  },

  /**
   * Check that value is a finite number and not NaN.
   * @param {String} name
   * @param {any} val
   */
  isNum: (name, val) => {
    if (typeof (val) === 'number' && !isNaN(val) && val < Infinity && val > -Infinity) {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  },

  /**
   * Check that value is a string.
   * @param {String} name
   * @param {any} val
   */
  isString: (name, val) => {
    if (typeof (val) === 'string') {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  },

  /**
   * Check that value is a finite number greater than or equal to zero.
   * @param {String} name
   * @param {any} val
   */
  isGeZero: (name, val) => {
    module.exports.isNum(name, val);
    if (val >= 0) {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  },

  /**
   * Check that value is a finite number greater than zero.
   * @param {String} name
   * @param {any} val
   */
  isGtZero: (name, val) => {
    module.exports.isNum(name, val);
    if (val > 0) {
      return;
    }
    throw new Error('Invalid value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name));
  },

  /**
   * Check that the value matches the regex.
   * @param {*} name
   * @param {*} val
   * @param {*} regex
   */
  isRegexMatch: (name, val, regex) => {
    module.exports.isString(name, val);
    if (regex.test(val)) {
      return;
    }
    throw new Error('Value ' + JSON.stringify(val) + ' for ' + JSON.stringify(name) + ' does not match ' + regex);
  }
};
