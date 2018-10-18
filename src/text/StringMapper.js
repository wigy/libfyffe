/**
 * Helper to scan matching objects based on JSON-configuration.
 */
class StringMapper {

  constructor(instructions) {
    this.instructions = instructions;
    console.log(instructions);
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
  }
}

module.exports = StringMapper;
