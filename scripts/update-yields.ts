import '../env'

import fetch from 'node-fetch'

import pool from '../src/db/pool'
import { deleteAllYields, insertYields } from '../src/db/yields'

async function fetchYields() {
  const yieldsRes = await fetch('https://yields.llama.fi/poolsOld')
  const yields = await yieldsRes.json()
  return yields.data
}

async function main() {
  const client = await pool.connect()

  try {
    const yields = await fetchYields()

    await client.query('BEGIN')

    await deleteAllYields(client)

    console.log(`Inserting ${yields.length} yields`)

    await insertYields(client, yields)

    await client.query('COMMIT')

    console.log(`Inserted ${yields.length} yields`)
  } catch (e) {
    console.log('Failed to update yields', e)
    await client.query('ROLLBACK')
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
