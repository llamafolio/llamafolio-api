import path from 'node:path'
import url from 'node:url'

import { selectAdapterProps } from '../src/db/adapters'
import { getContractsInteractions, groupContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import type { Adapter, Balance, BalancesContext, PricedBalance } from '../src/lib/adapter'
import { groupBy } from '../src/lib/array'
import { sanitizeBalances } from '../src/lib/balance'
import type { Chain } from '../src/lib/chains'
import { millify, millifyBI } from '../src/lib/fmt'
import { getPricedBalances } from '../src/lib/price'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

type ExtendedBalance = Balance & {
  groupIdx: number
}
interface CategoryBalances {
  title: string
  totalUSD: number
  balances: PricedBalance[]
}

function printBalances(balances: PricedBalance[]) {
  // group by category
  const balancesByCategory = groupBy(balances, 'category')

  const categoriesBalances: CategoryBalances[] = []
  for (const category in balancesByCategory) {
    const cat: CategoryBalances = {
      title: category,
      totalUSD: 0,
      balances: [],
    }

    for (const balance of balancesByCategory[category]) {
      cat.totalUSD += balance.balanceUSD || 0
      cat.balances.push(balance)
    }

    // sort by balanceUSD
    cat.balances.sort((a, b) => {
      if (a.balanceUSD != null && b.balanceUSD == null) {
        return -1
      }
      if (a.balanceUSD == null && b.balanceUSD != null) {
        return 1
      }
      return b.balanceUSD - a.balanceUSD
    })

    categoriesBalances.push(cat)
  }

  // sort categories by total balances
  categoriesBalances.sort((a, b) => b.totalUSD - a.totalUSD)

  for (const categoryBalances of categoriesBalances) {
    console.log(
      `Category: ${categoryBalances.title}, totalUSD: ${millify(categoryBalances.totalUSD)} (${
        categoryBalances.totalUSD
      })`,
    )

    const data: any[] = []

    for (const balance of categoryBalances.balances) {
      try {
        const decimals = balance.decimals ? 10n ** BigInt(balance.decimals) : 1n

        const d: { [key: string]: any } = {
          chain: balance.chain,
          address: balance.address,
          category: balance.category,
          symbol: balance.symbol,
          balance: millifyBI(balance.amount / decimals),
          balanceUSD: `$${millify(balance.balanceUSD !== undefined ? balance.balanceUSD : 0)}`,
          claimable: balance.claimable ? millifyBI(balance.claimable / decimals) : undefined,
          stable: balance.stable,
          type: balance.type,
          reward: '',
          underlying: '',
        }

        if (balance.rewards) {
          d.reward = balance.rewards
            .map((reward) => {
              const decimals = reward.decimals ? 10n ** BigInt(reward.decimals) : 1n

              return `${millifyBI(reward.amount / decimals)} ${reward.symbol}`
            })
            .join(' + ')
        }

        if (balance.underlyings) {
          d.underlying = balance.underlyings
            .map((underlying) => {
              const decimals = underlying.decimals ? 10n ** BigInt(underlying.decimals) : 1n

              return `${millify(Number(underlying.amount / decimals))} ${underlying.symbol}`
            })
            .join(' + ')
        }

        if (balance.category === 'perpetual') {
          d.margin = balance.margin ? millifyBI(balance.margin / decimals) : undefined
          d.entryPrice = balance.entryPrice ? millifyBI(balance.entryPrice / decimals) : undefined
          d.marketPrice = balance.marketPrice ? millifyBI(balance.marketPrice / decimals) : undefined
          d.leverage = balance.leverage ? millifyBI(balance.leverage / decimals) : undefined
        }

        data.push(d)
      } catch (error) {
        console.log('Failed to format balance', { balance, error })
      }
    }

    console.table(data)
  }
}

function help() {
  console.log('npm run adapter-balances {adapter} {chain} {address}')
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
