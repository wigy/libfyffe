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
    if (rule instanceof Object) {
      // Fixed key value pairs requiring exact match.
      return Object.keys(rule).reduce((prev, curr) => prev && rule[curr] === obj[curr], true);
    }
    throw new Error('No handler for rule ' + JSON.stringify(rule));
  }
}

module.exports = StringMapper;