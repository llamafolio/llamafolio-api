import { describe, expect, test } from 'vitest'

import { generateTestableRoute, getRoutes } from './config'
import { getApiURL } from './config/api-url'
import { routes as expectedRoutes } from './fixtures/routes'
import { testData } from './fixtures/test-data'

/**
 * Routes to skip in the test
 */
const SKIP_ROUTES = new Set([
  //
  '/gas_price/{chain}/chart',
])

const getFilteredRoutes = () => {
  const allRoutes = getRoutes({
    // @ts-ignore
    stage: process.env.STAGE,
  })
  return allRoutes
    .filter((route) => !SKIP_ROUTES.has(route.path))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((route) => ({
      ...route,
      // this is a hack since serverless-offline returns lowercase methods
      method: route.method.toUpperCase(),
    }))
}

describe('All routes', () => {
  const routes = () => getFilteredRoutes()
  test('should have routes', () => {
    expect(routes()).toBeDefined()
  })
  test('should have expected routes', () => {
    const expected = expectedRoutes.map((route) => route.path)
    const actual = routes().map((route) => route.path)
    expect(actual).toEqual(expected)
  })
})

/**
 * The test calls every endpoint/route in the network and checks:
 * - the response status code is 200
 * - the response body is not empty
 * - TODO: the response body is valid JSON
 */

const routes = getFilteredRoutes()

describe('API Routes', () => {
  // test against expected routes
  test.each(routes)('Route: %s', (route) => {
    const index = expectedRoutes.findIndex((r) => r.path === route.path)
    expect(index).toBeGreaterThan(-1)
    expect(expectedRoutes[index]).toBeDefined()
    expect(route).toEqual(expectedRoutes[index])
  })

  // test actual routes
  test.each(routes)(
    'method: $method, path: $path',
    async (route) => {
      // @ts-ignore
      const url = getApiURL(process.env.STAGE)
      const testableURL = `${url}${generateTestableRoute({ route, testData })}`
      console.log(`calling ${testableURL}`)
      const request = () => fetch(testableURL)
      await expect(request()).resolves.toHaveProperty('status', 200)
      await expect(request()).resolves.toHaveProperty('body')
      /* will be updated to actually check for valid JSON */
      await expect(request()).resolves.toHaveProperty('body', expect.anything())
      await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
    },
    // timeout is in milliseconds
    Number(process.env.TEST_WAIT_TIME) || 8000,
  )
})
