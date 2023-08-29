import { connect } from '@db/clickhouse'
import { selectLabelsByAddresses } from '@db/labels'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const LINKS = ['github', 'telegram', 'twitter', 'website']

/**
 * Get labels of given addresses
 */
export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const addresses = event.pathParameters?.address?.split(',') ?? []
  const data: { [key: string]: any } = {}
  for (const address of addresses) {
    if (!isHex(address)) {
      return badRequest('Invalid address parameter, expected hex')
    }

    data[address] = { labels: [], links: {} }
  }

  const client = connect()

  try {
    const labels = await selectLabelsByAddresses(client, addresses)

    for (const label of labels) {
      if (!data[label.address]) {
        continue
      }

      if (LINKS.includes(label.type)) {
        data[label.address].links[label.type] = label.value
      } else {
        data[label.address].labels.push({ type: label.type, value: label.value })
      }
    }

    return success(
      {
        data,
      },
      { maxAge: 20 * 60 },
    )
  } catch (error) {
    console.error('Failed to retrieve labels', { error, addresses })
    return serverError('Failed to retrieve labels')
  }
}
