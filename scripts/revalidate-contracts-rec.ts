import path from 'node:path'
import url from 'node:url'

import isEqual from 'lodash/isEqual'

import type { Adapter as DBAdapter } from '../src/db/adapters'
import { selectAdapter, upsertAdapters } from '../src/db/adapters'
import { deleteContractsByAdapter, insertAdaptersContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import type { Adapter, BaseContext } from '../src/lib/adapter'
import type { Chain } from '../src/lib/chains'
import { resolveContractsTokens } from '../src/lib/token'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('npm run revalidate-contracts-rec {adapter} {chain}')
}

/**
 * Recursively revalidate contracts of a chain for a given adapter
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: revalidate-contracts-rec.ts
  // argv[2]: adapter
  // argv[3]: chain
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chain = process.argv[3] as Chain
  const module = await import(path.join(__dirname, '..', 'src', 'adapters', process.argv[2]))
  const adapter = module.default as Adapter
  if (!adapter) {
    console.error(`Could not find adapter ${adapter}`)
    return
  }
  if (!adapter[chain]) {
    console.error(`Could not find chain ${chain} for adapter ${adapter}`)
    return
  }

  const client = await pool.connect()

  let prevDbAdapter = await selectAdapter(client, chain, adapter.id)

  for (let i = 0; ; i++) {
    try {
      console.log(`revalidate props`, prevDbAdapter?.contractsRevalidateProps)

      const ctx: BaseContext = { chain, adapterId: adapter.id }

      const config = await adapter[chain]!.getContracts(ctx, prevDbAdapter?.contractsRevalidateProps || {})

      // Don't look further if revalidateProps are identical (reached the end)
      if (
        config.revalidateProps &&
        prevDbAdapter?.contractsRevalidateProps &&
        isEqual(config.revalidateProps, prevDbAdapter?.contractsRevalidateProps)
      ) {
        break
      }

      const [contracts, props] = await Promise.all([
        resolveContractsTokens({ client, contractsMap: config.contracts || {}, storeMissingTokens: true }),
        config.props
          ? resolveContractsTokens({ client, contractsMap: config.props, storeMissingTokens: true })
          : undefined,
      ])

      let expire_at: Date | undefined = undefined
      if (config.revalidate) {
        expire_at = new Date()
        expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
      }

      const dbAdapter: DBAdapter = {
        id: adapter.id,
        chain,
        contractsExpireAt: expire_at,
        contractsRevalidateProps: config.revalidateProps,
        contractsProps: props,
        createdAt: new Date(),
      }

      prevDbAdapter = dbAdapter

      await client.query('BEGIN')

      await upsertAdapters(client, [dbAdapter])

      // Delete old contracts unless it's a revalidate.
      // In such case we want to add new contracts, not replace the old ones
      if (!config.revalidate) {
        await deleteContractsByAdapter(client, adapter.id, chain)
      }

      // Insert new contracts
      await insertAdaptersContracts(client, contracts, adapter.id)

      await client.query('COMMIT')
    } catch (e) {
      console.log('Failed to revalidate adapter contracts', e)
      await client.query('ROLLBACK')
      break
    }
  }

  client.release(true)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
