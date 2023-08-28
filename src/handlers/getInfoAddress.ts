import { connect } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { unixFromDateTime } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface AddressInfoResponse {
  data: {
    activeSince?: number
  }
}

/**
 * Get address info
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const client = connect()

    const queryRes = await client.query({
      query: `
        SELECT "timestamp" from evm_indexer.transactions_history_agg
        WHERE "target" = {address: String}
        ORDER BY "timestamp" ASC
        LIMIT 1;
      `,
      query_params: {
        address: address.toLowerCase(),
      },
    })

    const res = (await queryRes.json()) as {
      data: { timestamp: string }[]
    }

    const response: AddressInfoResponse = {
      data: { activeSince: res.data[0]?.timestamp ? unixFromDateTime(res.data[0].timestamp) : undefined },
    }

    return success(response, { maxAge: 60 * 60 })
  } catch (error) {
    console.error('Failed to get address info', { error })
    return serverError('Failed to get address info')
  }
}
