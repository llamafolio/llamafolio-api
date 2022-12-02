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

  const ensNames = await Promise.all(
    addresses.map(async (address) => {
      try {
        return await provider.lookupAddress(address)
      } catch {
        return
      }
    }),
  )

  for (let addressIdx = 0; addressIdx < addresses.length; addressIdx++) {
    const ensName = ensNames[addressIdx] || undefined

    const label = getLabel(addresses[addressIdx].toLowerCase(), ensName)

    if (label) {
      data[addresses[addressIdx]] = label
    }
  }

  return success(
    {
      data,
    },
    { maxAge: 10 * 60 },
  )
}
