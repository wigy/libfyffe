const config = require('../config');

const texts = {
  fi: {
    deposit: 'Talletus ${service}-palveluun',
    withdrawal: 'Nosto ${service}-palvelusta',
  }
};

module.exports = {
  get: (key) => {
    let orig = texts[config.language][key] || key;
    let ret = orig;
    const regex = /\$\{(\w+)\}/;
    while(match = regex.exec(ret)) {
      const variable = match[1];
      if (config[variable] === undefined) {
        throw new Error('Cannot translate text ' + JSON.stringify(orig) + ' since `' + variable + '` not configured.');
      }
      ret = ret.replace(regex, config[variable])
    }
    return ret;
  }
};
