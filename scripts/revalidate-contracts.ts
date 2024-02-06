import path from 'node:path'
import url from 'node:url'

import { selectAdapter } from '@db/adapters'
import { client } from '@db/clickhouse'
import { type Adapter, revalidateAdapterContracts } from '@lib/adapter'
import { chainByChainId, getChainId } from '@lib/chains'
import { fetchProtocolToParentMapping } from '@lib/protocols'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('pnpm run revalidate-contracts {adapter} {chain}')
}

/**
 * Revalidate contracts of all (or given) chain(s) for given adapter
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: revalidate-contracts.ts
  // argv[2]: adapter
  // argv[3]: chain
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const adapterId = process.argv[2]
  const chainId = getChainId(process.argv[3])
  const chain = chainByChainId[chainId]?.id
  if (chain == null) {
    console.error(`Chain not found ${process.argv[3]}`)
    return
  }
  const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
  const adapter = module.default as Adapter
  if (!adapter) {
    console.error(`Could not find adapter ${adapter}`)
    return
  }
  if (!adapter[chain]) {
    console.error(`Could not find chain ${chain} for adapter ${adapter}`)
    return
  }

  const protocolToParent = await fetchProtocolToParentMapping()

  const prevDbAdapter = await selectAdapter(client, chainId, adapter.id)

  await revalidateAdapterContracts(client, adapter, chain, prevDbAdapter, protocolToParent)

  console.log('Done')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
