import path from 'node:path'
import url from 'node:url'

import type { Adapter, BalancesContext } from '@lib/adapter'
import { chainByChainId, getChainId, getRPCClient } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import { resolveContractsTokens } from '@lib/token'
import { printBalancesConfig } from 'scripts/utils/balances'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('pnpm run adapter {adapter} {chain} {address}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: run-adapter.ts
  // argv[2]: adapter
  // argv[3]: chain
  // argv[4]: address
  if (process.argv.length < 5) {
    console.error('Missing arguments')
    return help()
  }

  const startTime = Date.now()

  const adapterId = process.argv[2]
  const chain = chainByChainId[getChainId(process.argv[3])]?.id
  if (chain == null) {
    console.error(`Chain not found ${process.argv[3]}`)
    return
  }
  const address = parseAddress(process.argv[4])
  if (address == null) {
    console.error(`Could not parse address ${process.argv[4]}`)
    return
  }

  const ctx: BalancesContext = { address, chain, adapterId, client: getRPCClient({ chain }) }

  try {
    const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
    const adapter = module.default as Adapter

    const chainAdapter = adapter[chain]
    if (!chainAdapter) {
      return console.error(
        `Chain ${chain} not supported for adapter ${adapterId}. \nMaybe you forgot to add this chain to src/adapters/${adapterId}/index.ts ?`,
      )
    }

    const contractsRes = await chainAdapter.getContracts(ctx, {})

    // resolve tokens symbol/decimals from addresses
    const contracts = await resolveContractsTokens(ctx, contractsRes?.contracts || {})

    const balancesConfig = await chainAdapter.getBalances(ctx, contracts)

    // fetch prices, sanitize empty balances and print
    await printBalancesConfig(balancesConfig)

    const endTime = Date.now()
    console.log(`Completed in ${endTime - startTime}ms`)
  } catch (error) {
    console.log('Failed to run adapter', error)
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
