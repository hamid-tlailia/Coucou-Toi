// Extends app.json.
// - Firebase (lock-screen notifications on Android) is enabled automatically
//   once google-services.json is in this folder.
// - Declares the messaging apps the app opens (Android 11+ package visibility).
const fs = require('fs');
const path = require('path');
const { withAndroidManifest } = require('expo/config-plugins');

const MESSAGING_PACKAGES = [
  'com.whatsapp', 'com.whatsapp.w4b',
  'com.facebook.orca', 'com.facebook.mlite', 'com.facebook.katana',
  'com.instagram.android', 'com.instagram.lite',
  'com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go',
];

const withMessagingQueries = (config) => withAndroidManifest(config, (cfg) => {
  const manifest = cfg.modResults.manifest;
  const queries = manifest.queries?.[0] || {};
  const existing = new Set((queries.package || []).map((p) => p.$['android:name']));
  queries.package = [
    ...(queries.package || []),
    ...MESSAGING_PACKAGES.filter((p) => !existing.has(p)).map((p) => ({ $: { 'android:name': p } })),
  ];
  manifest.queries = [queries, ...(manifest.queries || []).slice(1)];
  return cfg;
});

module.exports = ({ config }) => {
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return withMessagingQueries(config);
};
