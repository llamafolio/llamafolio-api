// @ts-check

/* No need to import/require dotenv because serverless.yml has `useDotenv: true` */

const isProduction = process.env.NODE_ENV === 'production'

/** @type {Array<import('esbuild').Plugin>} */
const plugins = []

if (!isProduction) {
  // @ts-expect-error - esbuild-analyzer doesn't come with types
  const AnalyzerPlugin = require('esbuild-analyzer')
  plugins.push(
    AnalyzerPlugin({
      outfile: './.esbuild/esbuild-analyzer.html',
    }),
  )
}

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
  target: 'node18',
  platform: 'node',
  minify: isProduction,
  external: ['pg-native', 'pg-format'],
  drop: isProduction ? ['console', 'debugger'] : [],
  metafile: !isProduction,
  plugins,
})
