import '../environment'

import { client } from '@db/clickhouse'
import type { Token } from '@db/tokens'
import { insertERC20Tokens } from '@db/tokens'
import { coingeckoPlatformToChain, fetchCoingeckoCoins } from '@lib/coingecko'
import { chains } from '@llamafolio/tokens'

async function main() {
  const coingeckoCoins = await fetchCoingeckoCoins()

  const coingeckoIdByChainByAddress: { [chain: string]: { [address: string]: string } } = {}

  for (const coin of coingeckoCoins) {
    if (!coin.platforms) {
      continue
    }

    for (const platform in coin.platforms) {
      const chain = coingeckoPlatformToChain[platform]
      if (!chain) {
        continue
      }

      if (!coingeckoIdByChainByAddress[chain]) {
        coingeckoIdByChainByAddress[chain] = {}
      }

      const address = coin.platforms[platform].toLowerCase()
      coingeckoIdByChainByAddress[chain][address] = coin.id
    }
  }

  try {
    const tokens: Token[] = []

    for (const chain in chains) {
      for (const token of chains[chain]) {
        tokens.push({
          address: token.address,
          chain,
          type: 0,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          coingeckoId: token.coingeckoId || coingeckoIdByChainByAddress[chain]?.[token.address] || undefined,
          cmcId: undefined,
          stable: token.stable,
        })
      }
    }

    await insertERC20Tokens(client, tokens)

    console.log(`Inserted ${tokens.length} tokens`)
  } catch (e) {
    console.log('Failed to insert tokens', e)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
