import { environment } from '@environment'
import { describe, expect, test } from 'vitest'

import { generateTestableRoute } from './config'
import { getApiURL } from './config/api-url'
import { routes as _routes } from './fixtures/routes'
import { testData } from './fixtures/test-data'

const STAGE = environment.STAGE as Exclude<typeof environment.STAGE, undefined>

/**
 * Routes to skip in the test
 */
const SKIP_ROUTES = [
  //
  '/gas_price/{chain}/chart',
]

const routes = _routes[STAGE].filter((route) => !SKIP_ROUTES.includes(route.path))

/**
 * The test calls every endpoint/route in the network and checks:
 * - the response status code is 200
 * - the response body is not empty
 * - TODO: the response body is valid JSON
 */

describe('API Routes', () => {
  // test actual routes
  test.each(routes)(
    'method: $method, path: $path',
    async (route) => {
      const url = getApiURL(STAGE)
      const testableURL = `${url}${generateTestableRoute({ route, testData })}`
      console.log(`calling ${testableURL}`)
      const request = () => fetch(testableURL)
      await expect(request()).resolves.toHaveProperty('status', 200)
      /* will be updated to actually check for valid JSON */
      await expect(request()).resolves.toHaveProperty('body', expect.anything())
      await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
    },
    // timeout is in milliseconds
    Number(process.env.TEST_WAIT_TIME) || 10000,
  )
})
