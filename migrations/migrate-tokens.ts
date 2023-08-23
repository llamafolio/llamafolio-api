import pool from '../src/db/pool'
import { chainById } from '../src/lib/chains'
import { connect } from '../src/db/clickhouse'

function help() {
  console.log('pnpm run migrate-tokens')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: migrate-tokens.ts

  const client = await pool.connect()
  const clickhouseClient = connect()

  try {
    let offset = 0
    while (true) {
      console.log('Offset', offset)
      const tokens = await client.query('select * from erc20_tokens offset $1 limit 10000;', [offset])
      if (tokens.rows.length === 0) {
        // merge duplicates
        await clickhouseClient.command({
          query: 'OPTIMIZE TABLE evm_indexer.tokens FINAL DEDUPLICATE;',
        })

        console.log('Done')
        return
      }

      offset += 10000

      const formattedTokens = []
      for (const row of tokens.rows) {
        const chain = chainById[row.chain]
        if (!chain) {
          console.log(`Missing chain ${row.chain}`)
          continue
        }

        formattedTokens.push({
          chain: chain.chainId,
          address: row.address.toLowerCase(),
          type: 0, // ERC20
          decimals: row.decimals,
          symbol: row.symbol,
          name: row.name,
          coingecko_id: row.coingecko_id,
          cmc_id: row.cmc_id,
          stable: row.stable,
        })
      }

      await clickhouseClient.insert({
        table: 'evm_indexer.tokens',
        values: formattedTokens,
        format: 'JSONEachRow',
      })
    }
  } catch (e) {
    console.log('Failed to migrate tokens', e)
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
