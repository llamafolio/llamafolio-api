import path from 'node:path'
import url from 'node:url'

import { selectAdapterProps } from '../src/db/adapters'
import { getContractsInteractions, groupContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import type { Adapter, Balance, BalancesContext } from '../src/lib/adapter'
import { groupBy } from '../src/lib/array'
import { sanitizeBalances } from '../src/lib/balance'
import type { Chain } from '../src/lib/chains'
import { getPricedBalances } from '../src/lib/price'
import { printBalances } from './utils/balances'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

type ExtendedBalance = Balance & {
  groupIdx: number
}

function help() {
  console.log('pnpm run adapter-balances {adapter} {chain} {address}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: run-balances.ts
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

  const client = await pool.connect()

  try {
    const [contracts, adapterProps] = await Promise.all([
      getContractsInteractions(client, address, adapterId, chain),
      selectAdapterProps(client, adapter.id, chain),
    ])

    console.log(`Interacted with ${contracts.length} contracts`)

    const balancesConfigRes = await adapter[chain]?.getBalances(
      ctx,
      groupContracts(contracts) || [],
      adapterProps?.contractsProps || {},
    )

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
        console.log('\nGroup:')
        const { healthFactor } = balancesConfigRes?.groups?.[groupIdx] || {}
        console.log('Metadata:')
        console.table({ healthFactor })
        printBalances(balances)
      }
    }

    const endTime = Date.now()
    console.log(`Completed in ${endTime - startTime}ms`)
  } catch (e) {
    console.log('Failed to run balances', e)
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
