export interface ApiGatewayRoute {
  ApiKeyRequired: boolean
  AuthorizationScopes: any[]
  AuthorizationType: string
  RequestModels: unknown
  RouteId: string
  RouteKey: string
  Target: string
}

export interface ApiGatewayRoutes {
  Items: ApiGatewayRoute[]
}

export interface Route {
  method: string
  path: string
  pathParams: Array<string>
  queryParams: Array<string>
}
