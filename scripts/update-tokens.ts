import '../env'

import { argv } from 'process'

import pool from '../src/db/pool'
import { insertTokens, selectUndecodedChainAddresses } from '../src/db/tokens'
import { Chain } from '../src/lib/chains'
import { getERC20Details } from '../src/lib/erc20'

function help() {
  console.log('npm run update-tokens {chain}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: update-tokens.ts
  // argv[2]: chain
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const chain = argv[2] as Chain
  const now = new Date()

  const client = await pool.connect()

  try {
    const limit = 1000
    let offset = 0

    while (true) {
      console.log('Offset', offset)
      const addresses = await selectUndecodedChainAddresses(client, chain, limit, offset)
      if (addresses.length === 0) {
        console.log(`Insert tokens done`)
        return
      }

      const tokens = (await getERC20Details(chain, addresses)).map((token) => ({
        ...token,
        symbol: token.symbol.replaceAll('\x00', ''),
        updated_at: now,
      }))

      console.log(tokens)

      console.log(`Inserting ${tokens.length} tokens on ${chain}`)

      await insertTokens(client, chain, tokens)

      offset += limit
    }
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
