/** @type {import('prettier').Config} */
module.exports = {
  printWidth: 120,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: {
        parser: 'json',
      },
    },
  ],
  plugins: ['prettier-plugin-sh', 'prettier-plugin-sql'],
}
