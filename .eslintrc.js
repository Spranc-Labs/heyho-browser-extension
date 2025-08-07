module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
    webextensions: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  globals: {
    // Browser extension globals
    chrome: 'readonly',
    browser: 'readonly',
    
    // Service worker globals
    self: 'readonly',
    importScripts: 'readonly',
    
    // IndexedDB
    indexedDB: 'readonly',
    IDBKeyRange: 'readonly',
    
    // Test globals
    StorageModule: 'readonly'
  },
  rules: {
    // Code quality
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console for extension logging
    'no-debugger': 'error',
    'no-alert': 'error',
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Style
    'indent': ['error', 2],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-trailing': 'off',
    'max-len': ['warn', { code: 100, ignoreUrls: true }],
    
    // ES6+
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'warn',
    
    // Async/Promise
    'no-async-promise-executor': 'error',
    'require-await': 'warn',
    
    // Security
    'no-new-require': 'error',
    'no-path-concat': 'error'
  },
  overrides: [
    {
      // Test files
      files: ['specs/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off'
      }
    },
    {
      // Background scripts
      files: ['background.js', 'src/background/**/*.js'],
      globals: {
        importScripts: 'readonly',
        self: 'readonly'
      }
    }
  ]
};