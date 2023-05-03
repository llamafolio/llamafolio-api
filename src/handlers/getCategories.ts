import { success } from '@handlers/response'
import { Categories } from '@lib/category'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  return success(
    {
      data: Object.values(Categories),
    },
    { maxAge: 10 * 60 },
  )
}
