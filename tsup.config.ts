import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  shims: true,
  tsconfig: './tsconfig.json',
  // bundle: false,
  entry: ['src/handlers/*'],
  outDir: 'dist',
  platform: 'node',
  target: 'node18',
  format: ['esm'],
  external: ['pg-native', 'pg-format'],
  minify: process.env.NODE_ENV === 'production',
})
