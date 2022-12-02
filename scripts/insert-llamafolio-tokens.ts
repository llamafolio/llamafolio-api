import '../env'

import { chains } from '@llamafolio/tokens'

import pool from '../src/db/pool'
import { insertTokens, Token } from '../src/db/tokens'

async function main() {
  const now = new Date()

  const client = await pool.connect()

  try {
    await Promise.all(
      Object.keys(chains).map((chain) => {
        const tokens: Token[] = chains[chain].map((token) => ({
          address: token.address,
          standard: 'erc20',
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          totalSupply: undefined,
          coingeckoId: token.coingeckoId || undefined,
          cmcId: undefined,
          updated_at: now,
        }))

        console.log(`Inserting ${tokens.length} tokens on ${chain}`)

        return insertTokens(client, chain, tokens)
      }),
    )
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
