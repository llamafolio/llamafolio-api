/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    warnOnUnsupportedTypeScriptVersion: true,
  },
  reportUnusedDisableDirectives: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:json/recommended',
    'plugin:security/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'simple-import-sort', 'unused-imports', 'prettier'],
  overrides: [
    {
      files: ['*.md'],
      processor: 'markdown/markdown',
      parser: 'eslint-plugin-markdownlint/parser',
      extends: ['plugin:markdown/recommended', 'plugin:markdownlint/recommended'],
      rules: {
        'markdownlint/md041': ['off'],
      },
    },
    {
      files: ['*.cjs', '*.cts'],
      rules: {
        '@typescript-eslint/no-var-requires': ['off'],
      },
    },
  ],
  rules: {
    'security/detect-object-injection': ['off'],
    'prettier/prettier': [
      'warn',
      {},
      {
        usePrettierrc: true,
        fileInfoOptions: {
          withNodeModules: true,
        },
      },
    ],
    '@typescript-eslint/no-var-requires': ['error'],
    '@typescript-eslint/ban-ts-comment': ['off'],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': ['off'],
    '@typescript-eslint/no-explicit-any': ['off'],
    '@typescript-eslint/no-non-null-assertion': ['off'],
    '@typescript-eslint/ban-types': [
      'warn',
      {
        types: {
          String: false,
          '{}': false,
        },
      },
    ],
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-empty-interface': [
      'error',
      {
        allowSingleExtends: true,
      },
    ],
    'simple-import-sort/exports': ['warn'],
    'simple-import-sort/imports': ['warn'],
    'unused-imports/no-unused-imports': ['warn'],
    'unused-imports/no-unused-imports-ts': ['warn'],
  },
}
