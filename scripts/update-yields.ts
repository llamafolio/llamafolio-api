import '../env'

import pool from '../src/db/pool2'
import { deleteAllYields, fetchYields, insertYields } from '../src/db/yields'

async function main() {
  const client = await pool.connect()

  try {
    const yields = await fetchYields()

    await client.query('BEGIN')

    await deleteAllYields(client)

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
