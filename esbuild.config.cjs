const { sentryEsbuildPlugin } = require('@sentry/esbuild-plugin')

const isProduction = process.env.NODE_ENV === 'production'

/**
 * TODO: Remove when Sentry project is created online by @0xsign
 */
const SENTRY_PROJECT_EXISTS = false

/** @type {import('esbuild').Plugin[]} */
const esbuildPlugins = [
  sentryEsbuildPlugin({
    org: 'llamafolio',
    project: 'llamafolio-api',
    // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
    // and need `project:releases` and `org:read` scopes
    authToken: process.env.SENTRY_AUTH_TOKEN,
    debug: !isProduction,
    sourcemaps: {
      // Specify the directory containing build artifacts
      assets: './dist/**',
    },
  }),
]

/**
 * @param {import('serverless').Options} _
 * @returns {import('esbuild').BuildOptions}
 */
module.exports = (_) => ({
  bundle: true,
  format: 'cjs',
  keepNames: true,
  platform: 'node',
  tsconfig: './tsconfig.json',
  minify: isProduction,
  drop: isProduction ? ['console', 'debugger'] : [],
  external: ['pg-native', 'pg-format'],
  // TODO: Remove when Sentry project is created online by @0xsign
  plugins: SENTRY_PROJECT_EXISTS ? esbuildPlugins : [],
})
