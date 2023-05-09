import environment from '@environment'
import { testData } from 'test/fixtures/test-data'
import { describe, expect, it, test } from 'vitest'

import { generateTestableRoute, getApiURL } from './config'
import { routes as testingRoutes } from './fixtures/routes'
// import {fetch} from 'undici'
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
  expect(routes.length).not.toBe(0)
})

const testTimeout = Number(process.env.TEST_WAIT_TIME) || 20000

describe('Routes', () => {
  const url = getApiURL(STAGE)
  // routes.forEach((route) => {
  //   describe(`Route: ${route.path}`, () => {
  //     const testableURL = `${url}${generateTestableRoute({ route, testData })}`

  //     test(`${route.path} should have a valid URL`, () => {
  //       expect(testableURL).toMatch(
  //         STAGE === 'local' ? /http:\/\/localhost:[0-9]+/ : /https:\/\/.+\.execute-api\..+\.amazonaws\.com/,
  //       )
  //     })

  //     test(
  //       `${route.path} should return 200 for`,
  //       async () => {
  //         const request = () => fetch(testableURL)
  //         // test actual routes
  //         await expect(request()).resolves.toHaveProperty('status', 200)
  //         await expect(request()).resolves.toHaveProperty('body')
  //       },
  //       { timeout: testTimeout },
  //     )

  //     test(
  //       `${route.path} should return a valid body\n`,
  //       async () => {
  //         const request = () => fetch(testableURL)
  //         /* will be updated to actually check for valid JSON */
  //         await expect(request()).resolves.toHaveProperty('body', expect.anything())
  //         await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
  //       },
  //       { timeout: testTimeout },
  //     )
  //   })
  // })
  test.concurrent.each(routes)(
    '$path',
    async (route) => {
      const testableURL = `${url}${generateTestableRoute({ route, testData })}`
      const request = () => fetch(testableURL)
      // test actual routes
      await expect(request()).resolves.toHaveProperty('status', 200)
      await expect(request()).resolves.toHaveProperty('body')
      /* will be updated to actually check for valid JSON */
      await expect(request()).resolves.toHaveProperty('body', expect.anything())
      await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
    },
    { timeout: testTimeout },
  )
})
