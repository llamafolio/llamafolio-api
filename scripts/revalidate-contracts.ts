import path from 'node:path'
import url from 'node:url'

import type { Adapter as DBAdapter } from '../src/db/adapters'
import { insertAdapters, selectAdapter } from '../src/db/adapters'
import { connect } from '../src/db/clickhouse'
import { flattenContracts, insertAdaptersContracts } from '../src/db/contracts'
import type { Adapter, BaseContext } from '../src/lib/adapter'
import type { Chain } from '../src/lib/chains'
import { chainById, chains } from '../src/lib/chains'
import { resolveContractsTokens } from '../src/lib/token'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('pnpm run revalidate-contracts {adapter} ?{chain}')
}

/**
 * Revalidate contracts of all (or given) chain(s) for given adapter
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
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

  try {
    const client = connect()

    const adapterChains = chain ? [chain] : chains.filter((chain) => adapter[chain.id]).map((chain) => chain.id)

    const chainContractsConfigs = await Promise.all(
      adapterChains.map(async (chain) => {
        const chainId = chainById[chain]?.chainId
        if (chainId == null) {
          throw new Error(`Missing chain ${chain}`)
        }

        const prevDbAdapter = await selectAdapter(client, chainId, adapter.id)

        const ctx: BaseContext = { chain, adapterId: adapter.id }

        const contractsRes = await adapter[chain]!.getContracts(ctx, prevDbAdapter?.contractsRevalidateProps || {})

        const contracts = await resolveContractsTokens(contractsRes?.contracts || {})

        return { ...contractsRes, contracts }
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

    await insertAdapters(client, dbAdapters)

    // Insert new contracts for all specified chains
    const adaptersContracts = chainContractsConfigs.map((config) => flattenContracts(config.contracts)).flat()

    await insertAdaptersContracts(client, adaptersContracts, adapter.id)
  } catch (e) {
    console.log('Failed to revalidate adapter contracts', e)
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
