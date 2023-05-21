import dns from 'node:dns'

import { environment } from '@environment'
import { wait } from '@lib/wait'
import { beforeAll, describe, expect, test } from 'vitest'

import { generateTestableRoute } from './config'
import { getApiURL } from './config/api-url'
import { routes as _routes } from './fixtures/routes'
import { testData } from './fixtures/test-data'

dns.setDefaultResultOrder('ipv4first')

const STAGE = environment.STAGE as Exclude<typeof environment.STAGE, undefined>

beforeAll(async () => {
  // wait for the API to be ready if CI
  if (process.env.CI) await wait(1500)
})

/**
 * Routes to skip in the test
 */
const SKIP_ROUTES = new Set([
  //
  '/gas_price/{chain}/chart',
])

const routes = _routes[STAGE].filter((route) => !SKIP_ROUTES.has(route.path))

describe('All routes', () => {
  test.concurrent.each(routes)('method: $method, path: $path', (route) => {
    expect(route).toBeDefined()
    expect(route.method).toBeDefined()
    expect(route.path).toBeDefined()
  })
})

const timeout = Number(process.env.TEST_TIMEOUT) || 12000

/**
 * The test calls every endpoint/route in the network and checks:
 * - the response status code is 200
 * - the response body is not empty
 * - TODO: the response body is valid JSON
 */

describe('API Routes', () => {
  // test actual routes
  test.concurrent.each(routes)(
    'method: $method, path: $path',
    async (route) => {
      const testableURL = `${getApiURL(STAGE)}${generateTestableRoute({ route, testData })}`
      const fetchLambda = () => fetch(testableURL)
      console.info(`\nINFO: Testing: ${testableURL}\n`)

      await expect(fetchLambda()).resolves.toHaveProperty('status', 200)
      /* will be updated to actually check for valid JSON */
      await expect(fetchLambda()).resolves.toHaveProperty('body', expect.anything())
      await expect(fetchLambda()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
    },
    // timeout is in milliseconds
    { timeout },
  )
})
