import path from 'node:path'
import url from 'node:url'

import { selectAdapter } from '@db/adapters'
import { client } from '@db/clickhouse'
import { type Adapter, revalidateAdapterContracts } from '@lib/adapter'
import { type Chain, chainById } from '@lib/chains'
import { fetchProtocolToParentMapping } from '@lib/protocols'

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

  let prevDbAdapter = await selectAdapter(client, adapter.id, chainId)

  const protocolToParent = await fetchProtocolToParentMapping()

  for (let i = 0; ; i++) {
    prevDbAdapter = await revalidateAdapterContracts(client, adapter, chain, prevDbAdapter, protocolToParent)
    if (!prevDbAdapter) {
      return console.log('Done')
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
