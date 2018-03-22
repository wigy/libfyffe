function findPrice(knex, targets, date = null) {
  const stamp = date === null ? new Date().getTime() : new Date(date + ' 00:00:00').getTime();
  // TODO: Crash if newer date is found for some target.
  console.log(stamp, date, targets);
}

module.exports = {
  findPrice: findPrice
};
