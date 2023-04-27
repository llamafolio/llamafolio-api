export interface RootRouteResponse {
  currentRoute: string
  error: string
  existingRoutes: string[]
  statusCode: number
}

const possibleParameters = ['address', 'chain'] as const
type PossibleParameter = typeof possibleParameters[number]

const possibleQueryParameters = [] as const
type PossibleQueryParameter = typeof possibleQueryParameters[number]

export interface RouteResponse {
  method: string
  path: string
  pathParams: PossibleParameter[]
  queryParams: PossibleQueryParameter[]
}

// we will parse the 'existingRoutes' and return a list of objects,
// object: method, path, pathParams, queryParams
export async function fetchEndpoints(url: string): Promise<Array<RouteResponse>> {
  console.log(`fetching endpoints from ${url}`)
  const response = await fetch(url)
  const data = (await response.json()) as RootRouteResponse
  const routes = data.existingRoutes.map((route) => {
    const [method, path] = route.split(' - ')
    const pathParams = (path.match(/{([^}]+)}/g)?.map((param) => param.replace(/[{}]/g, '')) ||
      []) as PossibleParameter[]
    const queryParams = (path.match(/\?([^}]+)/g)?.map((param) => param.replace(/[?]/g, '')) ||
      []) as PossibleQueryParameter[]
    return {
      method,
      path,
      pathParams,
      queryParams,
    }
  })
  return routes
}
