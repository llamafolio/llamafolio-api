import { response } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  return response({
    statusCode: 400,
    body: { message: "Endpoint doesn't exist" },
    maxAge: 3600,
  })
}
