const js = require('@eslint/js');
const globals = require('globals');
module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', '.verification/**'] },
  js.configs.recommended,
  {
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.jest } },
    rules: {
      // Legacy unused declarations are visible without blocking the runtime migration.
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
  { files: ['src/services/twilio.js'], languageOptions: { sourceType: 'module' } },
];
