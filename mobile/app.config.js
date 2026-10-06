// Extends app.json. Firebase (lock-screen notifications on Android) is
// enabled automatically once google-services.json is added to this folder —
// the APK still builds without it.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
