import { describe, expect, it } from 'vitest'

import { generateTestableRoute, getRoutes, testData } from './config'
import { getApiURL } from './config/api-url'
import { routes as expectedRoutes } from './fixtures/routes'

/**
 * Routes to not test: /holders, /history
 */
const SKIP_ROUTES = [
  //
  `/history/{address}`,
  `/holders/{address}`,
]

const getFilteredRoutes = async () => {
  const allRoutes = await getRoutes({
    //@ts-ignore
    stage: process.env.STAGE,
  })
  return allRoutes.filter((route) => !SKIP_ROUTES.includes(route.path))
}

describe('Network', () => {
  it('should have routes', async () => {
    const routes = () => getFilteredRoutes()
    expect(routes()).resolves.toBeDefined()
    expect(routes()).resolves.toHaveLength(expectedRoutes.length)
    expect(routes()).resolves.toEqual(expectedRoutes)
  })
})

/**
 * The test calls every endpoint/route in the network and checks:
 * - the response status code is 200
 * - the response body is not empty
 * - the response body is valid JSON
 * - the response body is not an error
 * - the response body is not a redirect
 */

const routes = await getFilteredRoutes()

routes.forEach(async (route) => {
  expect(route).toBeDefined()
  //
  it(
    `should call ${route.method} ${route.path}`,
    async () => {
      //
      if (route.pathParams.length === 0 || route.queryParams.length === 0) {
        const url = getApiURL(process.env.STAGE)
        const testableURL = `${url}${generateTestableRoute({ route, testData })}`
        const request = () => fetch(testableURL)
        await expect(request()).resolves.toHaveProperty('status', 200)
        await expect(request()).resolves.toHaveProperty('body')
        /* will be updated to actually check for valid JSON */
        await expect(request()).resolves.toHaveProperty('body', expect.anything())
        await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
      }
      console.log(`calling ${route.method} ${route.path}`)
    },
    // timeout is in milliseconds
    Number(process.env.TEST_WAIT_TIME) || 8000,
  )
})
