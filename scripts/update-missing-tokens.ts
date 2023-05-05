// Get contracts from adapters_contracts not already in erc20_tokens and try to get their symbols and decimals
import '../environment'

import { sliceIntoChunks } from '@lib/array'

import pool from '../src/db/pool'
import type { ERC20Token } from '../src/db/tokens'
import { insertERC20Tokens } from '../src/db/tokens'
import { getERC20Details } from '../src/lib/erc20'

function help() {
  console.log('npm run update-tokens')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-tokens.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const client = await pool.connect()

  try {
    const queryRes = await client.query(`
      select ac.chain, ac.address from adapters_contracts ac
      where ac.address not in (
        select address from erc20_tokens
      );
    `)

    console.log(`Found ${queryRes.rows.length} potential missing tokens`)

    const tokensByChain: { [chain: string]: any[] } = {}

    for (const row of queryRes.rows) {
      if (!tokensByChain[row.chain]) {
        tokensByChain[row.chain] = []
      }
      tokensByChain[row.chain].push(row)
    }

    for (const chain in tokensByChain) {
      const slices = sliceIntoChunks(tokensByChain[chain], 1000)

      for (const slice of slices) {
        const hrstart = process.hrtime()

        const chainsTokens = await getERC20Details(
          { chain, adapterId: '' },
          slice.map((contract) => contract.address),
        )

        const tokens: ERC20Token[] = []

        for (const token of chainsTokens) {
          tokens.push({
            address: token.address,
            chain,
            name: token.name,
            symbol: token.symbol.replaceAll('\x00', ''),
            decimals: token.decimals,
            coingeckoId: token.coingeckoId || undefined,
            cmcId: undefined,
          })
        }

        await insertERC20Tokens(client, tokens)

        const hrend = process.hrtime(hrstart)

        console.log(`Inserted ${tokens.length} tokens on ${chain} in %ds %dms`, hrend[0], hrend[1] / 1000000)
      }
    }
  } catch (e) {
    console.log('Failed to insert missing tokens', e)
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
