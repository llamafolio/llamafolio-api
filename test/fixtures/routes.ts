import { getRemoteRoutes } from 'test/config'

import serverlessYAML from '../../scripts/parse-serverless-yaml'

export const routes = {
  // parses serverless.yml for routes
  local: serverlessYAML('routes'),
  // calls `aws apigatewayv2 get-routes` for routes (dev)
  dev: getRemoteRoutes('dev'),
  // calls `aws apigatewayv2 get-routes` for routes (prod)
  prod: getRemoteRoutes('prod'),
}
