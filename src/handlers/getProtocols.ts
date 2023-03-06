import { selectProtocols } from '@db/protocols'
import { success } from '@handlers/response'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  const protocols = await selectProtocols()

  return success(
    {
      protocols,
    },
    { maxAge: 60 * 60 },
  )
}
