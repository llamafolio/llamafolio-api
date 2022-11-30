import { success } from '@handlers/response'
import { providers } from '@lib/providers'
import { getLabel } from '@llamafolio/labels'
import { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get labels of given addresses
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = event.pathParameters?.address?.split(',') ?? []
  const data: { [key: string]: any } = {}

  const provider = providers['ethereum']

  for (const address of addresses) {
    const ensName = await provider.lookupAddress(address)

    const label = getLabel(address.toLowerCase(), ensName)

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
