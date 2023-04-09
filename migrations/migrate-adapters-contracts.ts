import '../env'
import fs from 'fs'
import format from 'pg-format'

import pool from '../src/db/pool2'
import { sliceIntoChunks } from '@defillama/sdk/build/util'

function help() {
  console.log('npm run migrate-adapters-contracts')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: migrate-adapters-contracts.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const client = await pool.connect()

  try {
    // const res = await client.query(
    //   `select chain, '0x' || encode(address, 'hex') as address, adapter_id, name, standard, category, data from contracts`,
    // )

    // fs.writeFileSync('./contracts.json', JSON.stringify(res.rows))

    const rows = JSON.parse(fs.readFileSync('./contracts.json', 'utf8'))

    const values = rows.map((row: any) => [
      row.chain,
      row.address,
      row.adapter_id,
      row.name,
      row.standard,
      row.category,
      row.data,
    ])

    await Promise.all(
      sliceIntoChunks(values, 200).map((chunk) =>
        client.query(
          format(
            `INSERT INTO adapters_contracts (
              chain,
              address,
              adapter_id,
              name,
              standard,
              category,
              data
            ) VALUES %L ON CONFLICT DO NOTHING;`,
            chunk,
          ),
          [],
        ),
      ),
    )

    console.log(`Inserted ${rows.length} adapters_contracts`)
  } catch (e) {
    console.log('Failed to migrate adapters contracts', e)
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
