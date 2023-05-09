import environment from '@environment'
import { describe, expect, it, test } from 'vitest'

import { generateTestableRoute } from './config'
import { getApiURL } from './config/api-url'
import { routes as testingRoutes } from './fixtures/routes'
import { testData } from './fixtures/test-data'

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

describe('API Routes', () => {
  // test against expected routes
  test('Routes should not be empty', () => {
    expect(routes.length).not.toBe(0)
  })
  // should exclude SKIP_ROUTES
  test('Routes should not include SKIP_ROUTES', () => {
    expect(routes.every((route) => !SKIP_ROUTES.has(route.path))).toBe(true)
  })
})

const testTimeout = Number(process.env.TEST_WAIT_TIME) || 8000

describe.concurrent(
  'Individual Routes',
  () => {
    const url = getApiURL(STAGE)

    routes.forEach((route) => {
      describe.concurrent(
        `Route: ${route.path}`,
        () => {
          const testableURL = `${url}${generateTestableRoute({ route, testData })}`

          test(`${route.path} should have a valid URL`, () => {
            expect(testableURL).toMatch(
              STAGE === 'local' ? /http:\/\/localhost:[0-9]+/ : /https:\/\/.+\.execute-api\..+\.amazonaws\.com/,
            )
          })

          const request = () => fetch(testableURL)

          test(`${route.path} should return 200 for`, async () => {
            // test actual routes
            await expect(request()).resolves.toHaveProperty('status', 200)
            await expect(request()).resolves.toHaveProperty('body')
          })

          test(`${route.path} should return a valid body\n`, async () => {
            /* will be updated to actually check for valid JSON */
            await expect(request()).resolves.toHaveProperty('body', expect.anything())
            await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
          })
        },
        { timeout: testTimeout },
      )
    })
  },
  // timeout is in milliseconds
)
