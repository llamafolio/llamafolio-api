import '../environment'

import { chains } from '@llamafolio/tokens'

import { connect } from '../src/db/clickhouse'
import type { Token } from '../src/db/tokens'
import { insertERC20Tokens } from '../src/db/tokens'

async function main() {
  const client = connect()

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
          coingeckoId: token.coingeckoId || undefined,
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
