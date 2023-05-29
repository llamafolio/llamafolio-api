import { deleteAdapterById } from '../src/db/adapters'
import { deleteContractsByAdapterId } from '../src/db/contracts'
import pool from '../src/db/pool'

function help() {
  console.log('pnpm run delete-adapter {adapter}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: delete-adapter.ts
  // argv[2]: adapter
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const adapterId = process.argv[2]
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await deleteAdapterById(client, adapterId)

    await deleteContractsByAdapterId(client, adapterId)

    await client.query('COMMIT')
  } catch (e) {
    console.log('Failed to delete adapter', e)
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
