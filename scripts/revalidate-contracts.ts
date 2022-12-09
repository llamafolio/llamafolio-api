import path from 'path'

import { Adapter as DBAdapter, selectAdapter, upsertAdapters } from '../src/db/adapters'
import { deleteContractsByAdapter, insertContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import { Adapter, BaseContext } from '../src/lib/adapter'
import { Chain, chains } from '../src/lib/chains'
import { resolveContractsTokens } from '../src/lib/token'

function help() {
  console.log('npm run revalidate-contracts {adapter}')
}

/**
 * Revalidate contracts of all (or given) chain(s) for given adapter
 */
async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-contracts.ts
  // argv[2]: adapter
  // argv[3]: ?chain
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const chain = process.argv[3] as Chain | undefined
  const module = await import(path.join(__dirname, '..', 'src', 'adapters', process.argv[2]))
  const adapter = module.default as Adapter

  const client = await pool.connect()

  try {
    const adapterChains = chain ? [chain] : chains.filter((chain) => adapter[chain.id]).map((chain) => chain.id)

    const chainContractsConfigs = await Promise.all(
      adapterChains.map(async (chain) => {
        const prevDbAdapter = await selectAdapter(client, chain, adapter.id)

        const ctx: BaseContext = { chain, adapterId: adapter.id }

        const contractsRes = await adapter[chain]!.getContracts(ctx, prevDbAdapter?.contractsRevalidateProps || {})

        const contracts = await resolveContractsTokens(client, contractsRes?.contracts || {}, true)

        return {
          ...contractsRes,
          contracts,
        }
      }),
    )

    const now = new Date()

    const dbAdapters: DBAdapter[] = chainContractsConfigs.map((config, i) => {
      let expire_at: Date | undefined = undefined
      if (config.revalidate) {
        expire_at = new Date(now)
        expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
      }

      return {
        id: adapter.id,
        chain: adapterChains[i],
        contractsExpireAt: expire_at,
        contractsRevalidateProps: config.revalidateProps,
        createdAt: now,
      }
    })

    await client.query('BEGIN')

    await upsertAdapters(client, dbAdapters)

    // Delete old contracts unless it's a revalidate.
    // In such case we want to add new contracts, not replace the old ones
    await Promise.all(
      chainContractsConfigs.map((config, i) => {
        if (config.revalidate) {
          return
        }
        return deleteContractsByAdapter(client, adapter.id, adapterChains[i])
      }),
    )

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
