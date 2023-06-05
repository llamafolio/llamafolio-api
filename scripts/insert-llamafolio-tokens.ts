import '../environment'

import { chains } from '@llamafolio/tokens'

import pool from '../src/db/pool'
import type { ERC20Token } from '../src/db/tokens'
import { insertERC20Tokens } from '../src/db/tokens'

async function main() {
  const client = await pool.connect()

  try {
    const tokens: ERC20Token[] = []

    for (const chain in chains) {
      for (const token of chains[chain]) {
        tokens.push({
          address: token.address,
          chain,
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
  } finally {
    client.release(true)
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
