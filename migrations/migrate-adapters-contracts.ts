import pool from '../src/db/pool'
import { chainById } from '../src/lib/chains'
import { connect } from '../src/db/clickhouse'
import { toDateTime } from '@lib/fmt'

function help() {
  console.log('pnpm run migrate-adapters-contracts')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: migrate-adapters-contracts.ts

  const client = await pool.connect()
  const clickhouseClient = connect()

  try {
    let offset = 0
    while (true) {
      console.log('Offset', offset)
      const adaptersContracts = await client.query(
        'select ac.*, a.created_at from adapters_contracts ac join adapters a on ac.chain = a.chain and ac.adapter_id = a.id  offset $1 limit 10000;',
        [offset],
      )
      if (adaptersContracts.rows.length === 0) {
        // merge duplicates
        await clickhouseClient.command({
          query:
            'OPTIMIZE TABLE lf.adapters_contracts FINAL DEDUPLICATE BY "chain", "adapter_id", "address", "created_at";',
        })

        console.log('Done')
        return
      }

      offset += 10000

      const formattedAdaptersContracts = adaptersContracts.rows.map((row) => {
        const chain = chainById[row.chain]
        if (!chain) {
          throw new Error(`Missing chain ${chain}`)
        }

        return {
          chain: chain.chainId,
          type: row.type,
          standard: row.standard,
          category: row.category,
          name: row.name,
          display_name: row.display_name,
          address: row.address,
          adapter_id: row.adapter_id,
          data: JSON.stringify(row.data || {}),
          created_at: toDateTime(row.created_at),
        }
      })

      await clickhouseClient.insert({
        table: 'lf.adapters_contracts',
        values: formattedAdaptersContracts,
        format: 'JSONEachRow',
      })
    }
  } catch (e) {
    console.log('Failed to migrate adapters_contracts', e)
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
