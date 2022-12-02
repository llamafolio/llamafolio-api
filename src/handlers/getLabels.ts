import { success } from '@handlers/response'
import { chainById } from '@lib/chains'
import { getLabel } from '@llamafolio/labels'
import { APIGatewayProxyHandler } from 'aws-lambda'
import { ethers } from 'ethers'

/**
 * Get labels of given addresses
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = event.pathParameters?.address?.split(',') ?? []
  const data: { [key: string]: any } = {}

  const provider = new ethers.providers.StaticJsonRpcProvider(
    chainById['ethereum'].rpcUrl[0],
    chainById['ethereum'].chainId,
  )

  const ensNames = await Promise.all(
    addresses.map(async (address) => {
      try {
        const ensName = await provider.lookupAddress(ethers.utils.getAddress(address))
        return ensName
      } catch (error) {
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
