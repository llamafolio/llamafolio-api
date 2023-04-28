import { possibleParameters, possibleQueryParameters } from 'test/network/config/constants'

export type PossibleParameter = typeof possibleParameters[number]
export type PossibleQueryParameter = typeof possibleQueryParameters[number]

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
  pathParams: PossibleParameter[]
  queryParams: PossibleQueryParameter[]
}
