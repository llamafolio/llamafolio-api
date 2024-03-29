import { response } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  return response({
    statusCode: 200,
    body: {},
    headers: {
      'cache-control': 'max-age=31536000, s-maxage=31536000', // Caches preflight req on browser and proxy for 1 year
      'access-control-allow-methods': 'OPTIONS,GET',
      'access-control-allow-headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    },
  })
}
