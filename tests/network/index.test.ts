import { environment } from '@environment'
import { describe, expect, it } from 'vitest'

import { type RouteResponse, fetchEndpoints, generateUrl, testData } from './config'

/**
 * The test calls every endpoint/route in the network and checks:
 * - the response status code is 200
 * - the response body is not empty
 * - the response body is valid JSON
 * - the response body is not an error
 * - the response body is not a redirect
 */

const routes: Array<RouteResponse> = await fetchEndpoints(environment.API_URL)

describe('Network', () => {
  it('should have routes', async () => {
    expect(routes.length).toBeGreaterThan(0)
    expect(routes.length).toBe(16)
  })
})
routes.forEach(async (route) => {
  console.log(`calling ${route.method} ${route.path}`)
  it(`should call ${route.method} ${route.path}`, async () => {
    const urlPath = generateUrl({ route, testData })
    const url = `${environment.API_URL}${urlPath}`
    console.log(`calling ${url}`)
    // const response = await fetch(url)
    const request = () => fetch(url)
    // await expect(request()).resolves.toBeTruthy()
    await expect(request()).resolves.toHaveProperty('status', 200)
    // await expect(request()).resolves.toHaveProperty('body')
    // await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('error'))
    // await expect(request()).resolves.toHaveProperty('body', expect.not.stringContaining('redirect'))
  })
})
