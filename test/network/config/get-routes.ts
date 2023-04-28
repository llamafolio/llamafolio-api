import childProcess from 'node:child_process'
import fs from 'node:fs/promises'

import { getApiURL } from './api-url'
import { AwsStage } from './constants'
import type { ApiGatewayRoutes, Route } from './types'

export async function getRoutes({ stage }: { stage: AwsStage | 'local' }): Promise<Array<Route>> {
  const apiURL = getApiURL(stage)
  return stage === 'local' ? await getLocalRoutes(apiURL) : await getGatewayRoutes()
}

/**
 * this function runs aws command to get the routes,
 * save to test/network/config/apigateway-routes.json,
 * parse the json file and return a list of objects,
 * object: method, path, pathParams, queryParams
 */
export async function getGatewayRoutes(): Promise<Array<Route>> {
  const command = childProcess.spawnSync('aws', [
    'apigatewayv2',
    'get-routes',
    '--api-id',
    process.env.AWS_GATEWAY_API_ID_DEV,
  ])
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
  await fs.writeFile('test/fixtures/apigateway-routes.json', JSON.stringify(routes, undefined, 2))
  return routes
}

// we will parse the 'existingRoutes' and return a list of objects,
// object: method, path, pathParams, queryParams
async function getLocalRoutes(url = process.env.API_URL): Promise<Array<Route>> {
  // curl --silent --location --request GET 'http://localhost:3034'
  const command = childProcess.spawnSync('curl', ['--silent', '--location', '--request', 'GET', url as string])
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
