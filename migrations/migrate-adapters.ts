import '../env'
import fs from 'fs'
import format from 'pg-format'

import pool from '../src/db/pool'
import { sliceIntoChunks } from '@defillama/sdk/build/util'

function help() {
  console.log('npm run migrate-adapters')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: migrate-adapters.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const client = await pool.connect()

  try {
    // const res = await client.query(`select * from adapters`)
    // fs.writeFileSync('./adapters.json', JSON.stringify(res.rows))

    const rows = JSON.parse(fs.readFileSync('./adapters.json', 'utf8'))
    const values = rows.map((row: any) => [
      row.id,
      row.chain,
      row.contracts_expire_at,
      row.contracts_revalidate_props,
      row.contracts_props,
      row.created_at,
    ])
    await Promise.all(
      sliceIntoChunks(values, 200).map((chunk) =>
        client.query(
          format(
            `INSERT INTO adapters (
              id,
              chain,
              contracts_expire_at,
              contracts_revalidate_props,
              contracts_props,
              created_at
            ) VALUES %L ON CONFLICT DO NOTHING;`,
            chunk,
          ),
          [],
        ),
      ),
    )
    console.log(`Inserted ${rows.length} adapters`)
  } catch (e) {
    console.log('Failed to adapters', e)
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
