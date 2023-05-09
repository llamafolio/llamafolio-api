/// <reference types="vitest" />

import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import GithubActionsReporter from 'vitest-github-actions-reporter'

const timestamp = new Date().toISOString()

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3034,
  },
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    allowOnly: true,
    environment: 'node',
    globalSetup: ['./test/setup/global.ts'],
    env: {
      NODE_ENV: 'test',
      // disable experimental node warnings
      NODE_NO_WARNINGS: '1',
    },
    deps: {
      registerNodeLoader: true,
      experimentalOptimizer: {
        enabled: true,
      },
    },
    benchmark: {
      reporters: ['default', 'json'],
      outputFile: {
        json: `./test/benchmark/reports/${timestamp}.json`,
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['json'],
      reportsDirectory: './test/coverage',
    },
    threads: !process.env.GITHUB_ACTIONS,
    reporters: process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : [],
  },
})
