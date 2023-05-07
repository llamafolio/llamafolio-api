/**
 * No need to import/require dotenv because serverless.yml has `useDotenv: true`
 */
const AnalyzerPlugin = require('esbuild-analyzer')

const isProduction = process.env.NODE_ENV === 'production'

/**
 * @param {import('serverless').Options} _
 * @returns {import('esbuild').BuildOptions & { packager: string, concurrency: number }}
 */
module.exports = (_) => ({
  packager: 'pnpm',
  concurrency: 4,
  bundle: true,
  format: 'cjs',
  keepNames: true,
  platform: 'node',
  minify: isProduction,
  external: ['pg-native', 'pg-format'],
  drop: isProduction ? ['console', 'debugger'] : [],
  metafile: !isProduction,
  plugins: [
    AnalyzerPlugin({
      outfile: './.esbuild/esbuild-analyzer.html',
    }),
  ],
})
