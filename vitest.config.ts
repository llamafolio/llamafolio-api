/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    globals: true,
    allowOnly: true,
    globalSetup: [],
    setupFiles: ['dotenv/config'],
    include: ['./test/**/*.{test,spec}.ts', './src/**/*.{test,spec}.ts'],
    deps: {
      registerNodeLoader: true,
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['json'],
      reportsDirectory: './test/coverage',
    },
    reporters: ['json'],
    outputFile: './test/reports/report.json',
    env: {
      NODE_ENV: 'test',
      API_URL: 'http://localhost:3034',
    },
    alias: {
      '@**': './src/**',
      '@environment': './environment.ts',
    },
  },
})
