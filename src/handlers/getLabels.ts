import { success } from '@handlers/response'
import { getLabel } from '@llamafolio/labels'
import { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get labels of given addresses
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = event.pathParameters?.address?.split(',') ?? []
  const data: { [key: string]: any } = {}

  for (const address of addresses) {
    const label = getLabel(address.toLowerCase())

    if (label) {
      data[address] = label
    }
  }

  return success(
    {
      data,
    },
    { maxAge: 10 * 60 },
  )
}
