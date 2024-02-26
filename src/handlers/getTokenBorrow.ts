import { client } from '@db/clickhouse'
import { type BorrowPoolStorage, selectTokenBorrowPools } from '@db/lendBorrow'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { getChainId, getRPCClient } from '@lib/chains'
import { getTokenDetails } from '@lib/erc20'
import { parseAddress } from '@lib/fmt'
import { isNotNullish, type UnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface BorrowPool extends Omit<BorrowPoolStorage, 'underlyings' | 'rewards'> {
  symbol?: string
  decimals?: number
  name?: string
  underlyings: {
    address: string
    decimals?: number
    symbol?: string
    name?: string
  }[]
  rewards: {
    address: string
    decimals?: number
    symbol?: string
    name?: string
  }[]
}

interface BorrowPoolResponse {
  data: BorrowPool[]
  count: number
  updatedAt?: UnixTimestamp
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (address == null) {
    return badRequest('Missing address parameter')
  }

  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const ctx: BaseContext = { chain: 'ethereum', adapterId: '', client: getRPCClient({ chain: 'ethereum' }) }

  try {
    const { data, updatedAt } = await selectTokenBorrowPools(client, chainId, address)

    // Add tokens metadata
    const maybeTokenAddresses = new Set<`0x${string}`>()
    for (const row of data) {
      maybeTokenAddresses.add(row.address as `0x${string}`)

      if (row.underlyings) {
        for (const address of row.underlyings) {
          maybeTokenAddresses.add(address as `0x${string}`)
        }
      }

      if (row.rewards) {
        for (const address of row.rewards) {
          maybeTokenAddresses.add(address as `0x${string}`)
        }
      }
    }

    const tokenDetails = await getTokenDetails(ctx, Array.from(maybeTokenAddresses))
    const tokenByAddress = keyBy(tokenDetails, 'address')

    for (const row of data) {
      if (tokenByAddress[row.address]) {
        row.symbol = tokenByAddress[row.address].symbol
        row.decimals = tokenByAddress[row.address].decimals
        row.name = tokenByAddress[row.address].name
      }

      if (row.underlyings) {
        row.underlyings = row.underlyings
          .map((address) => {
            if (tokenByAddress[address]) {
              return {
                address,
                symbol: tokenByAddress[address].symbol,
                decimals: tokenByAddress[address].decimals,
                name: tokenByAddress[address].name,
              }
            }
          })
          .filter(isNotNullish)
      }

      if (row.rewards) {
        row.rewards = row.rewards
          .map((address) => {
            if (tokenByAddress[address]) {
              return {
                address,
                symbol: tokenByAddress[address].symbol,
                decimals: tokenByAddress[address].decimals,
                name: tokenByAddress[address].name,
              }
            }
          })
          .filter(isNotNullish)
      }
    }

    const response: BorrowPoolResponse = {
      data,
      updatedAt,
      count: data.length,
    }

    return success(response, { maxAge: 60 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to find token borrow pools', error)
    return serverError('Failed to find token borrow pools', { error })
  }
}
