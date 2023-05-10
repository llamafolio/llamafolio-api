import dns from 'node:dns'

import { environment } from '@environment'
import { describe, expect, test } from 'vitest'

import { generateTestableRoute } from './config'
import { getApiURL } from './config/api-url'
import { routes as _routes } from './fixtures/routes'
import { testData } from './fixtures/test-data'

dns.setDefaultResultOrder('ipv4first')

const STAGE = environment.STAGE as Exclude<typeof environment.STAGE, undefined>

export const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Routes to skip in the test
 */
const SKIP_ROUTES = new Set([
  //
  '/gas_price/{chain}/chart',
])

const routes = _routes[STAGE].filter((route) => !SKIP_ROUTES.has(route.path))

/**
 * The test calls every endpoint/route in the network and checks:
 * - the response status code is 200
 * - the response body is not empty
 * - TODO: the response body is valid JSON
 */

const fetchLambda = async (url: string) =>
  await fetch(url).catch((error) => {
    console.error('ERROR: fetchLambda', error)
    throw error
  })

describe.concurrent('API Routes', () => {
  // test actual routes
  const url = getApiURL(STAGE)
  console.info(`\nINFO: Base URL to test against: ${url}\n`)
  test.concurrent.each(routes)(
    'method: $method, path: $path',
    async (route) => {
      const testableURL = `${url}${generateTestableRoute({ route, testData })}`
      console.info(`\nINFO: Testing: ${testableURL}\n`)

      await expect(fetchLambda(testableURL)).resolves.toHaveProperty('status', 200)
      /* will be updated to actually check for valid JSON */
      await expect(fetchLambda(testableURL)).resolves.toHaveProperty('body', expect.anything())
      await expect(fetchLambda(testableURL)).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
      // const { status, statusText, body } = await fetch(testableURL)
      // expect(status).toBe(200)
      // expect(statusText).toBe('OK')
      // expect(body).toBeDefined()
    },
    // timeout is in milliseconds
    10000,
  )
})
