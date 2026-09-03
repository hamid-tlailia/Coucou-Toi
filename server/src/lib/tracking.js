const crypto = require('crypto');

function trackingCode(id) {
  return `${id}-${crypto.randomInt(1000, 9999)}`;
}

module.exports = { trackingCode };
