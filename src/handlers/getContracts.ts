import { connect } from '@db/clickhouse'
import { getContracts } from '@db/contracts'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { chainById } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface IContract {
  block: number
  chain: string
  contract: string
  creator: string
  hash: string
  verified: boolean
  protocol?: string
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

  const chainParam = event.queryStringParameters?.chain || ''
  const chain = chainById[chainParam]

  try {
    const client = connect()

    const contracts = await getContracts(client, address, chain?.chainId)

    return success({ data: contracts }, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve contracts', e)
    return serverError('Failed to retrieve contracts')
  }
}
