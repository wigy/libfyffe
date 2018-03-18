/**
 * Check if tags table is available.
 * @param {Knex} knex Knex-instance configured for the database.
 * @return {Promise<boolean>}
 */
function isReady(knex) {
  return knex.schema.hasTable('tags');
}

/**
 * Make sure that table for tags exists.
 * @param {Knex} knex Knex-instance configured for the database.
 * @return {Promise<true>}
 */
function ensure(knex) {
  return isReady(knex)
    .then((yes) => {
      if (yes) {
        return Promise.resolve(true);
      }
      return knex.schema.createTable('tags', function (table) {
        table.increments('id').primary();
        table.string('tag', 16).notNullable();
        table.string('name', 256).nullable();
        table.string('picture', 512).nullable();
        table.string('type', 16).nullable();
        table.integer('order');

        table.unique('tag');
        table.index('type');
        table.index('order');
      })
        .then(() => true);
    });
}

/**
 * Get all tags.
 * @param {Knex} knex Knex-instance configured for the database.
 */
function getAll(knex) {
  return ensure(knex)
    .then(() => {
      return knex.select('*').from('tags').orderBy('order');
    });
}

/**
 * Insert a tag.
 * @param {Knex} knex Knex-instance configured for the database.
 * @param {string} tag
 * @param {string} name
 * @param {string} picture
 * @param {string} type
 * @param {integer} order
 * @return {Promise}
 */
function add(knex, tag, name, picture, type, order) {
  return ensure(knex)
    .then(() => {
      return knex('tags').insert({
        tag: tag,
        name: name,
        picture: picture,
        type: type,
        order: order
      });
    });
}

module.exports = {
  isReady: isReady,
  add: add,
  ensure: ensure,
  getAll: getAll
};
