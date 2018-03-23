class Export {

  constructor(name) {
    this.name = name;
  }

  /**
   * Execute exporting.
   * @param {Knex} knex
   * @param {Object} options
   */
  export(knex, options) {
    throw new Error('Exporting not implemented for ' + this.name);
  }
}

module.exports = Export;
