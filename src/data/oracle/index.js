
let tickers = require('./isin2ticker.json');

function isin2ticker(isin, failIfNotFound = true) {
  if (tickers[isin]) {
    return tickers[isin];
  }
  if (failIfNotFound) {
    throw new Error('Cannot find ISIN ' + isin);
  }
  return null;
}

module.exports = {
  isin2ticker
};
