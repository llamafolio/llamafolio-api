import { client } from '@db/clickhouse'
import { getContract } from '@db/contracts'
import { badRequest, notFound, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { chainById } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface IContract {
  block: number
  chain: string
  contract: string
  creator: string
  hash: string
  verified?: boolean
  abi?: any
  name?: string
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const chainParam = event.pathParameters?.chain || ''
  const chain = chainById[chainParam]
  if (!chain) {
    return badRequest('Invalid chain parameter')
  }

  try {
    const contract = await getContract(client, chain.chainId, address)
    if (!contract) {
      return notFound('Could not find contract')
    }

    return success({ data: contract }, { maxAge: 24 * 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve contracts', e)
    return serverError('Failed to retrieve contracts')
  }
}
