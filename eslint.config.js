// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  // index-3.html eski derlenmiş demo; taşıma bitene kadar referans olarak duruyor.
  globalIgnores(['dist/*', 'index-3.html']),
]);
