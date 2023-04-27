/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    setupFiles: ['dotenv/config'],
    deps: { registerNodeLoader: true },
    include: ['./tests/**/*.{test,spec}.ts'],
    env: {
      NODE_ENV: 'test',
      API_URL: 'http://localhost:3034',
    },
    coverage: {
      provider: 'istanbul',
    },
    alias: {
      '@adapters': './src/adapters',
      '@db': './src/db',
      '@env': './env',
      '@handlers': './src/handlers',
      '@lib': './src/lib',
      '@**': './src/**',
      '@environment': './environment.ts',
    },
  },
})
