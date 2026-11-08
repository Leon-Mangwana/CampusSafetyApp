const js = require('@eslint/js');
const n = require('eslint-plugin-n');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  n.configs['flat/recommended-script'],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      'no-console': 'off',
      'n/no-process-exit': 'off',
      'n/no-unpublished-require': 'off',
      'n/no-missing-require': 'off',
      'n/hashbang': 'off',
    },
  },
];
