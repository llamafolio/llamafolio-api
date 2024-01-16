import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import { keyBy, sliceIntoChunks } from '@lib/array'
import { chainById } from '@lib/chains'
import { coingeckoPlatformToChain, fetchCoingeckoCoins } from '@lib/coingecko'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateCoingeckoCoins: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateCoingeckoCoins', {}, 'Event')

  return success({})
}

/**
 * Patch missing coingecko_id in tokens table
 */
export const scheduledUpdateCoingeckoCoins = wrapScheduledLambda(updateCoingeckoCoins)

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const patches: {
      type: string
      decimals: number
      symbol: string
      name: string
      coingecko_id: string
      stable: boolean
    }[] = []
    const coingeckoCoins = await fetchCoingeckoCoins()

    const coinsByChain: { [chainId: number]: { address: string; coingeckoId: string }[] } = {}

    for (const coin of coingeckoCoins) {
      if (!coin.platforms) {
        continue
      }

      for (const platform in coin.platforms) {
        const chain = chainById[coingeckoPlatformToChain[platform]]
        if (!chain) {
          continue
        }

        if (!coinsByChain[chain.chainId]) {
          coinsByChain[chain.chainId] = []
        }

        const address = coin.platforms[platform].toLowerCase()
        coinsByChain[chain.chainId].push({ address, coingeckoId: coin.id })
      }
    }

    for (const chainId in coinsByChain) {
      const coins = coinsByChain[chainId]
      const coinsSlices = sliceIntoChunks(coins, 500)

      for (const slice of coinsSlices) {
        const sliceByAddress = keyBy(coins, 'address')

        const queryRes = await client.query({
          query: `
            SELECT *
            FROM evm_indexer2.tokens
            WHERE
              "chain" = {chainId: UInt64} AND
              "address" IN {addresses: Array(String)} AND
              "coingecko_id" = '';
          `,
          query_params: {
            chainId,
            addresses: slice.map((coin) => coin.address),
          },
        })

        const res = (await queryRes.json()) as {
          data: {
            address: string
            type: string
            decimals: number
            symbol: string
            name: string
            coingecko_id: string
            stable: boolean
          }[]
        }

        for (const row of res.data) {
          const coin = sliceByAddress[row.address]
          if (!coin) {
            continue
          }

          patches.push({ ...row, coingecko_id: coin.coingeckoId })
        }
      }
    }

    if (patches.length > 0) {
      await client.insert({
        table: 'evm_indexer2.tokens',
        values: patches,
        format: 'JSONEachRow',
      })
    }

    console.log(`Updating ${patches.length} coins`)
    return success({})
  } catch (e) {
    console.log('Failed to update coins', e)
    return serverError(`Failed to update coins: ${e}`)
  }
}
