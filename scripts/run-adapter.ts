import path from 'node:path'
import url from 'node:url'

import type { Adapter, Balance, BalancesContext } from '../src/lib/adapter'
import { groupBy } from '../src/lib/array'
import { sanitizeBalances } from '../src/lib/balance'
import type { Chain } from '../src/lib/chains'
import { getPricedBalances } from '../src/lib/price'
import { resolveContractsTokens } from '../src/lib/token'
import { printBalances } from './utils/balances'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

type ExtendedBalance = Balance & {
  groupIdx: number
}

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
  const chain = process.argv[3] as Chain
  const address = process.argv[4].toLowerCase() as `0x${string}`

  const ctx: BalancesContext = { address, chain, adapterId }

  const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
  const adapter = module.default as Adapter

  try {
    const contractsRes = await adapter[chain]?.getContracts(ctx, {})

    const contracts = await resolveContractsTokens({ contractsMap: contractsRes?.contracts || {} })

    const balancesConfigRes = await adapter[chain]?.getBalances(ctx, contracts)

    // flatten balances and fetch their prices
    const balances: ExtendedBalance[] =
      balancesConfigRes?.groups?.flatMap((group, groupIdx) =>
        (group.balances || []).map((balance) => ({ ...balance, groupIdx })),
      ) || []

    const sanitizedBalances = sanitizeBalances(balances)

    const pricedBalances = await getPricedBalances(sanitizedBalances)

    console.log(`Found ${pricedBalances.length} non zero balances`)

    const balancesByGroupIdx = groupBy(pricedBalances, 'groupIdx')

    const groupsLen = balancesConfigRes?.groups.length || 0
    for (let groupIdx = 0; groupIdx < groupsLen; groupIdx++) {
      const balances = balancesByGroupIdx[groupIdx]
      if (balances?.length > 0) {
        const { healthFactor } = balancesConfigRes?.groups?.[groupIdx] || {}
        if (healthFactor != null) {
          console.log('\nGroup:')
          console.log('Metadata:')
          console.table({ healthFactor })
        }
        printBalances(balances)
      }
    }

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
