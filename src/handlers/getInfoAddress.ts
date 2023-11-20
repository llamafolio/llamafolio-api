import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { parseAddresses, shortAddress, unixFromDateTime } from '@lib/fmt'
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
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Missing address parameter')
  }

  try {
    const queryRes = await client.query({
      query: `
        SELECT min("min_timestamp") AS "timestamp"
        FROM evm_indexer2.transactions_from_agg_mv
        WHERE
          "from_short" IN {addresses_short: Array(String)} AND
          "from_address" IN {addresses: Array(String)};
      `,
      query_params: {
        addresses_short: addresses.map(shortAddress),
        addresses: addresses,
      },
    })

    const res = (await queryRes.json()) as {
      data: { timestamp: string }[]
    }

    const response: AddressInfoResponse = {
      data: { activeSince: res.data[0]?.timestamp ? unixFromDateTime(res.data[0].timestamp) : undefined },
    }

    return success(response, { maxAge: 24 * 60 * 60 })
  } catch (error) {
    console.error('Failed to get address info', { error })
    return serverError('Failed to get address info')
  }
}
