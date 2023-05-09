import childProcess from 'node:child_process'

import type { AwsStage } from './constants'
import { AwsGatewayApiId } from './constants'
import type { ApiGatewayRoutes, Route } from './types'

export function getRemoteRoutes(stage: AwsStage = 'dev'): Array<Route> {
  if (['dev', 'prod'].includes(stage) === false) throw new Error('Invalid stage')
  const apiId = AwsGatewayApiId[stage] as string
  const command = childProcess.spawnSync('aws', ['apigatewayv2', 'get-routes', '--api-id', apiId])
  if (command.stderr.toString()) throw new Error('Getting routes from `aws apigatewayv2 get-routes` failed')
  const data = JSON.parse(command.stdout.toString()) as ApiGatewayRoutes
  const routes = data.Items.map((route) => {
    const [method] = route.RouteKey.split(' ')
    const [, path] = route.RouteKey.split(' ')
    const pathParams = route.RouteKey.match(/{([^}]+)}/g)?.map((param) => param.replace(/[{}]/g, '')) || []
    const queryParams = route.RouteKey.match(/\?([^}]+)/g)?.map((param) => param.replace(/[?]/g, '')) || []
    return { method, path, pathParams, queryParams }
  })
  return routes as Array<Route>
}
