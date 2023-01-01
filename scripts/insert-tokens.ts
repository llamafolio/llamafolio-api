import '../env'

import { argv } from 'process'

import pool from '../src/db/pool'
import { insertTokens } from '../src/db/tokens'
import { BaseContext } from '../src/lib/adapter'
import { Chain } from '../src/lib/chains'
import { getERC20Details } from '../src/lib/erc20'

function help() {
  console.log('npm run insert-tokens {chain} {addresses}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: insert-tokens.ts
  // argv[2]: chain
  // argv[3]: addresses (comma separated)
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chain = argv[2] as Chain
  const addresses = argv[3].split(',')
  const now = new Date()

  const ctx: BaseContext = { chain, adapterId: '' }

  const client = await pool.connect()

  try {
    const tokens = (await getERC20Details(ctx, addresses)).map((token) => ({
      ...token,
      updated_at: now,
    }))

    console.log(`Inserting ${tokens.length} tokens on ${chain}`)

    await insertTokens(client, chain, tokens)
  } catch (e) {
    console.log('Failed to insert tokens', e)
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
