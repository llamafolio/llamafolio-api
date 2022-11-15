import { success } from '@handlers/response'
import { Token } from '@lib/token'
import { getToken } from '@llamafolio/tokens'
import { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get tokens of given addresses
 * Tokens are comma separated and should be prefixed by their chain: `{chain}:{address}`
 * Or only the name of the chain to get the native coin. Ex: `arbitrum,avax,ethereum`
 * (Chain 'ethereum' is used by default if no chain is specified)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const chainAddresses = event.pathParameters?.address?.split(',') ?? []
  const data: { [key: string]: Token } = {}

  for (const chainAddress of chainAddresses) {
    const split = chainAddress.split(':')
    let chain = 'ethereum'
    let address: string | undefined

    // chain or address
    if (split.length === 1) {
      if (split[0].startsWith('0x')) {
        address = split[0]
      } else {
        chain = split[0]
      }
    } else {
      chain = split[0]
      address = split[1]
    }

    const token = getToken(chain, address?.toLowerCase()) as Token

    if (token) {
      data[chainAddress] = token
    }
  }

  return success(
    {
      data,
    },
    { maxAge: 10 * 60 },
  )
}
