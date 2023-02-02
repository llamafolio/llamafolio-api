import { serverError, success } from '@handlers/response'
import { getChainBlocks } from '@lib/indexer/fetchers'
import { HASURA_HEADERS } from '@lib/indexer/utils'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  try {
    const chains_indexed_state = await getChainBlocks(HASURA_HEADERS)
    return success(chains_indexed_state, { maxAge: 10 })
  } catch (e) {
    console.error('Failed to retrieve sync status', e)
    return serverError('Failed to retrieve sync status')
  }
}
