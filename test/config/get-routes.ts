import childProcess from 'node:child_process'
import fs from 'node:fs'

import { getApiURL } from './api-url'
import { AwsStage } from './constants'
import type { ApiGatewayRoutes, Route } from './types'

export function getRoutes({ stage }: { stage: AwsStage | 'local' }): Array<Route> {
  const apiURL = getApiURL(stage)
  return stage === 'local' ? getLocalRoutes(apiURL) : getGatewayRoutes()
}

/**
 * this function runs aws command to get the routes,
 * save to test/network/config/apigateway-routes.json,
 * parse the json file and return a list of objects,
 * object: method, path, pathParams, queryParams
 */
export function getGatewayRoutes(): Array<Route> {
  const command = childProcess.spawnSync('aws', [
    'apigatewayv2',
    'get-routes',
    '--api-id',
    process.env.AWS_GATEWAY_API_ID_DEV,
  ])
  if (command.stderr.toString()) throw new Error('Getting routes from `aws apigatewayv2 get-routes` failed')
  const data = JSON.parse(command.stdout.toString()) as ApiGatewayRoutes
  const routes = data.Items.map((route) => {
    const method = route.RouteKey.split(' ')[0]
    const path = route.RouteKey.split(' ')[1]
    const pathParams = route.RouteKey.match(/{([^}]+)}/g)?.map((param) => param.replace(/[{}]/g, '')) || []
    const queryParams = route.RouteKey.match(/\?([^}]+)/g)?.map((param) => param.replace(/[?]/g, '')) || []
    return {
      method,
      path,
      pathParams,
      queryParams,
    }
  }) as Array<Route>
  fs.writeFileSync('test/fixtures/apigateway-routes.json', JSON.stringify(routes, undefined, 2))
  return routes
}

// we will parse the 'existingRoutes' and return a list of objects,
// object: method, path, pathParams, queryParams
function getLocalRoutes(url = process.env.API_URL): Array<Route> {
  if (!url) throw new Error('API_URL is not defined')
  // curl --silent --location --request GET 'http://localhost:3034'
  const command = childProcess.spawnSync('curl', ['--silent', '--location', '--request', 'GET', url])
  if (command.stderr.toString()) throw new Error('Getting routes from `curl` failed')
  const data = JSON.parse(command.stdout.toString()) as {
    currentRoute: string
    error: string
    existingRoutes: string[]
    statusCode: number
  }
  const routes = data.existingRoutes.map((route) => {
    const [method, path] = route.split(' - ')
    const pathParams = path.match(/{([^}]+)}/g)?.map((param) => param.replace(/[{}]/g, '')) || []
    const queryParams = path.match(/\?([^}]+)/g)?.map((param) => param.replace(/[?]/g, '')) || []
    return {
      method,
      path,
      pathParams,
      queryParams,
    }
  })
  return routes as Array<Route>
}
