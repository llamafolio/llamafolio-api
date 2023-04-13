import '../env'
import fs from 'fs'
import format from 'pg-format'

import pool from '../src/db/pool'
import { sliceIntoChunks } from '@defillama/sdk/build/util'

function help() {
  console.log('npm run migrate-labels')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: migrate-labels.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const client = await pool.connect()

  try {
    // const res = await client.query(
    //   `select '0x' || encode(address, 'hex') as address, type, value, updated_at from labels`,
    // )
    // fs.writeFileSync('./labels.json', JSON.stringify(res.rows))

    const rows = JSON.parse(fs.readFileSync('./labels.json', 'utf8'))
    const values = rows.map((row: any) => [row.address, row.type, row.value, row.updated_at])

    await Promise.all(
      sliceIntoChunks(values, 200).map((chunk) =>
        client.query(
          format(
            `INSERT INTO labels (
              address,
              type,
              value,
              updated_at
            ) VALUES %L ON CONFLICT DO NOTHING;`,
            chunk,
          ),
          [],
        ),
      ),
    )
    console.log(`Inserted ${rows.length} labels`)
  } catch (e) {
    console.log('Failed to migrate labels', e)
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
