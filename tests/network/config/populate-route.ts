import { RouteResponse } from './fetch-endpoints'
import type { TestData } from './test-data'

// based on on the route, this function generates a valid path with params

export function generateUrl({ route, testData }: { route: RouteResponse; testData: TestData }): string {
  const { path, pathParams, queryParams } = route
  let url = path
  pathParams.forEach((param) => {
    url = url.replace(`{${param}}`, testData[param])
  })
  if (queryParams.length === 0) return url
  url += '?'
  queryParams.forEach((param) => {
    url += `${param}=${testData[param]}&`
  })
  url = url.slice(0, -1)
  return url
}
