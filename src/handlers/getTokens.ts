import { badRequest, success } from '@handlers/response'
import { chains } from '@lib/chains'
import { isNotNullish } from '@lib/type'
import { getToken } from '@llamafolio/tokens'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address as `0x${string}`

  if (!address) {
    return badRequest('Missing address parameter')
  }

  const data = chains.map((chain) => getToken(chain.id, address?.toLowerCase())).filter(isNotNullish)

  return success(data, { maxAge: 60 * 60 })
}
