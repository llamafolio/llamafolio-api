import { adapters } from '@adapters/index'
import { success } from '@handlers/response'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  return success(
    {
      data: {
        adapters: adapters.map((adapter) => ({ id: adapter.id })),
      },
    },
    { maxAge: 10 * 60 },
  )
}
