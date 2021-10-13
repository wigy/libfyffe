/**
 * Helper to scan matching objects based on JSON-configuration.
 */
class StringMapper {

  constructor(instructions) {
    this.instructions = instructions;
    // TODO: Consider converting instructions to pre-defined functions here.
  }

  /**
   * Get data from the instruction collection for the `instructions[key][name]`.
   * @param {String} key
   * @param {String} name
   */
  get(key, name) {
    if (this.instructions[key] === undefined || this.instructions[key][name] === undefined) {
      throw new Error('String mapper does not know `' + key + '` `' + name + '` pair.');
    }
    const str = this.instructions[key][name];
    return str;
  }

  /**
   * Recognize an object.
   * @param {String} key Key of the instruction set to use.
   * @param {Object} obj
   * @return {String} The name of the object.
   */
  findMatch(key, obj) {
    const rules = Object.keys(this.instructions[key] || {});
    for (let i = 0; i < rules.length; i++) {
      const rule = this.instructions[key][rules[i]];
      if (this.matchRule(rule, obj)) {
        return rules[i];
      }
    }
  }

  /**
   * Check if object matches the rule.
   * @param {Object} rule
   * @param {Object} object
   */
  matchRule(rule, obj) {
    // If array, match any.
    if (rule instanceof Array) {
      for (let i = 0; i < rule.length; i++) {
        if (this.matchRule(rule[i], obj)) {
          return true;
        }
      }
      return false;
    }

    if (rule instanceof Object) {
      // Fixed key value pairs requiring exact match.
      return Object.keys(rule).reduce((prev, curr) => prev && (curr === '=>' || this.compare(rule[curr], obj[curr])), true);
    }
    throw new Error('No handler for rule ' + JSON.stringify(rule));
  }

  /**
   * Compare a single field value to the rule.
   * @param {String|Array} rule
   * @param {any} value
   */
  compare(rule, value) {
    // Missing members of object won't match.
    if (value === undefined) {
      return false;
    }
    if (rule instanceof Array) {
      for (let i = 0; i < rule.length; i++) {
        if (this.compare(rule[i], value)) {
          return true;
        }
      }
      return false;
    }

    if (rule.startsWith('/')) {
      const parts = rule.split('/');
      const regex = new RegExp(parts[1], parts[2]);
      return regex.test(value);
    }
    value = value.trim();

    if (/^>-?[0-9.]+$/.test(rule)) {
      const limit = parseFloat(rule.substr(1));
      value = parseFloat(value.replace(/,(\d\d)$/, '.$1').replace(/ /g, ''));
      return value > limit;
    } else if (/^<-?[0-9.]+$/.test(rule)) {
      const limit = parseFloat(rule.substr(1));
      value = parseFloat(value.replace(/,(\d\d)$/, '.$1').replace(/ /g, ''));
      return value < limit;
    } else if (/^=-?[0-9.]+$/.test(rule)) {
      const limit = parseFloat(rule.substr(1));
      value = parseFloat(value.replace(/,(\d\d)$/, '.$1').replace(/ /g, ''));
      return Math.abs(value - limit) < 1e-3;
    }

    return rule === value;
  }
}

module.exports = StringMapper;
