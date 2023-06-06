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
    'plugin:vitest/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'simple-import-sort', 'unused-imports', 'prettier'],
  overrides: [
    // Markdown
    {
      files: ['*.md'],
      processor: 'markdown/markdown',
      parser: 'eslint-plugin-markdownlint/parser',
      extends: ['plugin:markdown/recommended', 'plugin:markdownlint/recommended'],
      rules: {
        'markdownlint/md041': ['off'],
      },
    },
  ],
  rules: {
    'vitest/no-commented-out-tests': ['warn'],
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
    '@typescript-eslint/ban-types': ['off'],
    '@typescript-eslint/no-var-requires': ['off', { allow: ['*.mjs'] }],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-import-type-side-effects': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    '@typescript-eslint/no-unused-vars': [
      'error',
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
    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': 'error',
    'unused-imports/no-unused-imports-ts': 'error',
  },
}
