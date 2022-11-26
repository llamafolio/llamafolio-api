import path from 'path'

import { Adapter as DBAdapter, deleteAdapterById, insertAdapters } from '../src/db/adapters'
import { deleteContractsByAdapterId, insertContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import { Adapter } from '../src/lib/adapter'
import { chains } from '../src/lib/chains'

function help() {
  console.log('npm run revalidate-contracts {adapter}')
}

/**
 * Revalidate contracts of all chains for given adapter
 */
async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-contracts.ts
  // argv[2]: adapter
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const module = await import(path.join(__dirname, '..', 'src', 'adapters', process.argv[2]))
  const adapter = module.default as Adapter

  const adapterChains = chains.filter((chain) => adapter[chain.id])

  const chainContractsConfigs = await Promise.all(adapterChains.map((chain) => adapter[chain.id]!.getContracts()))

  const now = new Date()

  const dbAdapters: DBAdapter[] = chainContractsConfigs.map((config, i) => {
    let expire_at: Date | undefined = undefined
    if (config.revalidate) {
      expire_at = new Date(now)
      expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
    }

    return {
      id: adapter.id,
      chain: adapterChains[i].id,
      contractsExpireAt: expire_at,
    }
  })

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Delete old adapters
    await deleteAdapterById(client, adapter.id)

    // Insert new adapters
    await insertAdapters(client, dbAdapters)

    // Delete old contracts
    await deleteContractsByAdapterId(client, adapter.id)

    // Insert new contracts for all specified chains
    await Promise.all(chainContractsConfigs.map((config) => insertContracts(client, config.contracts, adapter.id)))

    await client.query('COMMIT')
  } catch (e) {
    console.log('Failed to revalidate adapter contracts', e)
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
