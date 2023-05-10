import assert from 'node:assert'

import environment from '@environment'
import { describe, expect, it, test } from 'bun:test'
import { testData } from 'test/fixtures/test-data'

import { generateTestableRoute, getApiURL } from './config'
import { routes as testingRoutes } from './fixtures/routes'

// we're checking in the global setup that it can't be undefined (test/setup/global.ts)
const STAGE = environment.STAGE as Exclude<typeof environment.STAGE, undefined>

describe('API URL', () => {
  it('Should return a valid URL', () => {
    expect(getApiURL(STAGE)).toMatch(
      STAGE === 'local' ? 'http://localhost:3034' : /https:\/\/.+\.execute-api\..+\.amazonaws\.com/,
    )
  })
})
/**
 * Routes to skip in the test
 */
const SKIP_ROUTES = new Set([
  //
  '/gas_price/{chain}/chart',
])

const routes = testingRoutes[STAGE].filter((route) => !SKIP_ROUTES.has(route.path))

test('Routes should not be empty', () => {
  assert.notStrictEqual(routes.length, 0)
})

const _testTimeout = Number(process.env.TEST_WAIT_TIME) || 10000

describe('Routes', () => {
  routes.forEach((route) => {
    //
    describe(`Route: ${route.path}`, () => {
      //
      const url = getApiURL(STAGE)
      const testableURL = `${url}${generateTestableRoute({ route, testData })}`

      test(`${route.path} should return 200 for`, async () => {
        const request = () => fetch(testableURL)
        // test actual routes
        await assert.doesNotReject(request)
        assert.strictEqual((await request()).status, 200)
      })

      test(`${route.path} should return a valid body`, async () => {
        const request = () => fetch(testableURL)
        /* will be updated to actually check for valid JSON */
        assert.notStrictEqual((await request()).body, undefined)
      })
    })
  })
})
