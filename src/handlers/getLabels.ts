import { success } from '@handlers/response'
import twitterLabels from '@labels/twitter-labels.json'
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
    const label = getLabel(address.toLowerCase())

    if (label) {
      data[address] = label
    }

    const ensName = await provider.lookupAddress(address)
    if (ensName) {
      const twitter = (twitterLabels as { name: string; handle: string }[]).find((twitter) => twitter.name === ensName)

      if (twitter) {
        data[address].links = { ...data[address].links, twitter: `https://twitter.com/${twitter.handle}` }
      }
    }
  }

  return success(
    {
      data,
    },
    { maxAge: 10 * 60 },
  )
}
