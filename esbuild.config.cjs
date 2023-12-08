// @ts-check

/* No need to import/require dotenv because serverless.yml has `useDotenv: true` */

const isProduction = process.env.NODE_ENV === 'production'

/** @type {Array<import('esbuild').Plugin>} */
const plugins = []

if (!isProduction) {
  // @ts-ignore - esbuild-analyzer doesn't come with types
  const AnalyzerPlugin = require('esbuild-analyzer')
  plugins.push(
    AnalyzerPlugin({
      outfile: './.esbuild/esbuild-analyzer.html',
    }),
  )
}

/**
 * @param {import('serverless').Options} _
 * @returns {import('esbuild').BuildOptions & { packager: string, concurrency: number; watch: import('esbuild').WatchOptions; keepOutputDirectory?: boolean; }}
 */
module.exports = (_) => ({
  packager: 'pnpm',
  concurrency: 4,
  bundle: true,
  format: 'esm',
  keepNames: true,
  target: 'esnext',
  platform: 'node',
  minify: isProduction,
  drop: isProduction ? ['console', 'debugger'] : [],
  metafile: !isProduction,
  plugins,
  banner: {
    js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
  },
  watch: {
    pattern: ['src/**/*.ts'],
    ignore: ['.serverless/**/*', '.build', 'dist', 'node_modules', 'test'],
  },
})
