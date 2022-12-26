import millify from 'millify'
import path from 'path'

import { selectAdapterProps } from '../src/db/adapters'
import {
  getAllChainTokensInteractions,
  getChainContractsInteractionsTokenTransfers,
  groupContracts,
} from '../src/db/contracts'
import pool from '../src/db/pool'
import { Adapter, Balance, BalancesContext } from '../src/lib/adapter'
import { sanitizeBalances } from '../src/lib/balance'
import { Chain } from '../src/lib/chains'
import { getPricedBalances } from '../src/lib/price'

interface CategoryBalances {
  title: string
  totalUSD: number
  balances: Balance[]
}

function help() {
  console.log('npm run adapter-balances {adapter} {chain} {address}')
}

async function main() {
  // argv[0]: ts-node
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
  const address = process.argv[4].toLowerCase()

  const ctx: BalancesContext = { address, chain, adapterId }

  const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
  const adapter = module.default as Adapter

  const client = await pool.connect()

  try {
    const [contracts, adapterProps] = await Promise.all([
      adapter.id === 'wallet'
        ? getAllChainTokensInteractions(client, chain, ctx.address)
        : getChainContractsInteractionsTokenTransfers(client, chain, ctx.address, adapter.id),
      selectAdapterProps(client, adapter.id),
    ])

    console.log(`Interacted with ${contracts.length} contracts`)

    const balancesRes = await adapter[chain]?.getBalances(
      ctx,
      groupContracts(contracts) || [],
      adapterProps?.contractsProps || {},
    )
    const sanitizedBalances = sanitizeBalances(balancesRes?.balances || [])

    const pricedBalances = await getPricedBalances(sanitizedBalances)

    console.log(`Found ${pricedBalances.length} non zero balances`)

    // group by category
    const balancesByCategory: Record<string, Balance[]> = {}
    for (const balance of pricedBalances) {
      if (!balancesByCategory[balance.category]) {
        balancesByCategory[balance.category] = []
      }
      balancesByCategory[balance.category].push(balance)
    }

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
        const d = {
          chain: balance.chain,
          address: balance.address,
          category: balance.category,
          symbol: balance.symbol,
          balance: millify(balance.amount / 10 ** balance.decimals),
          balanceUSD: `$${millify(balance.balanceUSD !== undefined ? balance.balanceUSD : 0)}`,
          stable: balance.stable,
          type: balance.type,
        }

        if (balance.rewards) {
          d.reward = balance.rewards
            .map((reward) => `${millify(reward.amount / 10 ** reward.decimals)} ${reward.symbol}`)
            .join(' + ')
        }

        if (balance.underlyings) {
          d.underlying = balance.underlyings
            .map((underlying) => `${millify(underlying.amount / 10 ** underlying.decimals)} ${underlying.symbol}`)
            .join(' + ')
        }

        data.push(d)
      }

      console.table(data)
    }

    const { healthFactor } = balancesRes || {}
    console.log('Metadata:')
    console.table({ healthFactor })

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
