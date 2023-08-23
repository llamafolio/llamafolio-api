import pool from '../src/db/pool'
import { chainById } from '../src/lib/chains'
import { connect } from '../src/db/clickhouse'
import { toDateTime } from '@lib/fmt'

function help() {
  console.log('pnpm run migrate-adapters')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: migrate-adapters.ts

  const client = await pool.connect()
  const clickhouseClient = connect()

  try {
    const adapters = await client.query('select * from adapters;')

    const formattedAdapters = adapters.rows.map((row) => {
      const chain = chainById[row.chain]
      if (!chain) {
        throw new Error(`Missing chain ${chain}`)
      }

      return {
        id: row.id,
        chain: chain.chainId,
        contracts_expire_at: row.contracts_expire_at ? toDateTime(row.contracts_expire_at) : null,
        contracts_revalidate_props: row.contracts_revalidate_props
          ? JSON.stringify(row.contracts_revalidate_props)
          : null,
        contracts_props: row.contracts_props ? JSON.stringify(row.contracts_props) : null,
        created_at: toDateTime(row.created_at),
      }
    })

    await clickhouseClient.insert({
      table: 'lf.adapters',
      values: formattedAdapters,
      format: 'JSONEachRow',
    })

    // merge duplicates
    await clickhouseClient.command({
      query: 'OPTIMIZE TABLE lf.adapters FINAL DEDUPLICATE BY "chain", "id";',
    })
  } catch (e) {
    console.log('Failed to migrate adapters', e)
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
