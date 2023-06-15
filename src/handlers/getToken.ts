import { badRequest, notFound, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const chain = event.pathParameters?.chain as Chain
  const address = event.pathParameters?.address?.toLowerCase() as `0x${string}`

  if (!chain) {
    return badRequest('Missing chain parameter')
  }

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const ctx: BaseContext = { chain, adapterId: '' }

  const [token] = await getERC20Details(ctx, [address])

  if (!token) {
    return notFound('Token not found', { maxAge: 60 * 60 })
  }

  return success(token, { maxAge: 60 * 60 })
}
