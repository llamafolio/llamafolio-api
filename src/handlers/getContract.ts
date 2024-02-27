import { client } from '@db/clickhouse'
import { getContract } from '@db/contracts'
import { badRequest, notFound, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { chainById, getRPCClient } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface IContract {
  block: number
  chain: string
  contract: string
  creator: string
  hash: string
  verified?: boolean | null
  abi?: any
  name?: string
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (!address) {
    return badRequest('Invalid address parameter')
  }

  const chainParam = event.pathParameters?.chain || ''
  const chain = chainById[chainParam]

  if (!chain) {
    return badRequest('Invalid chain parameter')
  }

  const baseContext: BaseContext = { chain: chain.id, adapterId: '', client: getRPCClient({ chain: chain.id }) }

  try {
    const contract = await getContract(client, chain.chainId, address)
    if (!contract) {
      return notFound('Could not find contract')
    }

    return success({ data: contract }, { maxAge: 24 * 60 * 60 })
  } catch (error) {
    console.error('Failed to retrieve contracts', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to retrieve contracts',
      message: (error as any).message,
    })
    return serverError('Failed to retrieve contracts')
  }
}
