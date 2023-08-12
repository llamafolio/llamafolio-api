import { connect } from '@db/clickhouse'
import { getContracts, getContractsV1 } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { type Chain, chainById } from '@lib/chains'
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

export const getContract: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = await pool.connect()

  try {
    const chain = event.queryStringParameters?.chain as Chain

    const contracts = await getContracts(client, address, chain)

    return success({ data: contracts }, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve contracts', e)
    return serverError('Failed to retrieve contracts')
  } finally {
    client.release(true)
  }
}

export const handlerV1: APIGatewayProxyHandler = async (event) => {
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

    const contracts = await getContractsV1(client, address, chain?.chainId)

    return success({ data: contracts }, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve contracts', e)
    return serverError('Failed to retrieve contracts')
  }
}
