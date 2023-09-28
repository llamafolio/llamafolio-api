import path from 'node:path'
import url from 'node:url'

import { fetchProtocolToParentMapping } from '@lib/protocols'
import isEqual from 'lodash/isEqual'

import type { Adapter as DBAdapter } from '../src/db/adapters'
import { insertAdapters, selectAdapter } from '../src/db/adapters'
import { client } from '../src/db/clickhouse'
import { flattenContracts, insertAdaptersContracts } from '../src/db/contracts'
import type { Adapter, BaseContext } from '../src/lib/adapter'
import { type Chain, chainById } from '../src/lib/chains'
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
  const chainId = chainById[chain]?.chainId
  if (chainId == null) {
    console.error(`Missing chain ${chain}`)
    return
  }

  let prevDbAdapter = await selectAdapter(client, chainId, adapter.id)

  const protocolToParent = await fetchProtocolToParentMapping()

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

      const contracts = await resolveContractsTokens(config.contracts || {})

      let expire_at: Date | undefined = undefined
      if (config.revalidate) {
        expire_at = new Date()
        expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
      }

      const dbAdapter: DBAdapter = {
        id: adapter.id,
        parentId: protocolToParent[adapter.id] || '',
        chain,
        contractsExpireAt: expire_at,
        contractsRevalidateProps: config.revalidateProps,
        createdAt: new Date(),
      }

      prevDbAdapter = dbAdapter

      await insertAdapters(client, [dbAdapter])

      // Insert new contracts
      await insertAdaptersContracts(client, flattenContracts(contracts), adapter.id)
    } catch (e) {
      console.log('Failed to revalidate adapter contracts', e)
      break
    }
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
