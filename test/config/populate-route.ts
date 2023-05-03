import type { TestData } from '../fixtures/test-data'
import type { Route } from './types'

// based on on the route, this function generates a valid path with params

export function generateTestableRoute({ route, testData }: { route: Route; testData: TestData }): string {
  const { path, pathParams, queryParams } = route
  let url = path
  pathParams.forEach((param) => {
    const data = url.includes('tokens') ? testData['token'] : testData[param]
    url = url.replace(`{${param}}`, data)
  })
  if (queryParams.length === 0) return url
  url += '?'
  queryParams.forEach((param) => {
    url += `${param}=${testData[param]}&`
  })
  url = url.slice(0, -1)
  return url
}
