import pool from '../src/db/pool'
import { updateBalances } from '../src/handlers/updateBalances'

function help() {
  console.log('pnpm update-balances {address}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-balances.ts
  // argv[2]: address
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const address = process.argv[2].toLowerCase() as `0x${string}`

  const client = await pool.connect()

  try {
    await updateBalances(client, address)
  } catch (e) {
    console.log('Failed to update balances', e)
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
