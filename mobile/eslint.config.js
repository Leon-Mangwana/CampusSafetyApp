const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**', 'coverage/**'] },
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  prettier,
  {
    rules: {
      // Unused args are often part of a callback signature (e.g. navigation).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'react-hooks/exhaustive-deps': 'warn',
      // Apostrophes and quotes inside <Text> render fine in React Native; the
      // HTML-entity escaping this rule wants only hurts readability.
      'react/no-unescaped-entities': 'off',
      // Keep in step with the backend config so the shared classifier file
      // lints identically in both packages.
      'no-control-regex': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.js', 'jest.setup.js', 'jest.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
];
