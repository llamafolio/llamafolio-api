/* eslint-disable @typescript-eslint/no-var-requires */

const { pathsToModuleNameMapper } = require('ts-jest')
const tsconfig = require('./tsconfig.json')

module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',

  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
}
