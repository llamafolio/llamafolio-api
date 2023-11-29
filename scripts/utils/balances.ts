import { groupBy } from '@lib/array'
import { fmtBalanceBreakdown, resolveHealthFactor, sanitizeBalances } from '@lib/balance'
import { parseFloatBI, sum } from '@lib/math'
import { getPricedBalances } from '@lib/price'

import type { Balance, BalancesConfig, PricedBalance } from '@/lib/adapter'

export interface CategoryBalances {
  title: string
  totalUSD: number
  balances: PricedBalance[]
}

export function printBalances(balances: PricedBalance[]) {
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
      return b.balanceUSD! - a.balanceUSD!
    })

    categoriesBalances.push(cat)
  }

  // sort categories by total balances
  categoriesBalances.sort((a, b) => b.totalUSD - a.totalUSD)

  for (const categoryBalances of categoriesBalances) {
    console.log(`Category: ${categoryBalances.title}, totalUSD: ${categoryBalances.totalUSD.toLocaleString()}`)

    const data: any[] = []

    for (const balance of categoryBalances.balances) {
      try {
        const decimals = Number(balance.decimals || 18n)

        const d: { [key: string]: any } = {
          address: balance.address,
          category: balance.category,
          symbol: balance.symbol,
          balance: parseFloatBI(balance.amount, decimals).toLocaleString(),
          balanceUSD: `$${balance.balanceUSD !== undefined ? balance.balanceUSD.toLocaleString() : 0}`,
          stable: Boolean(balance.stable || balance.underlyings?.every((underlying) => underlying.stable)),
        }

        if (balance.claimable) {
          d.claimable = balance.claimable ? parseFloatBI(balance.claimable, decimals).toLocaleString() : undefined
        }

        if (balance.rewards) {
          d.reward = balance.rewards
            .map((reward) => {
              const decimals = Number(reward.decimals || 1n)
              return `${parseFloatBI(reward.amount, decimals).toLocaleString()} ${reward.symbol}`
            })
            .join(' + ')
        }

        if (balance.underlyings) {
          d.underlying = balance.underlyings
            .map((underlying) => {
              const decimals = Number(underlying.decimals || 1n)
              return `${parseFloatBI(underlying.amount, decimals).toLocaleString()} ${underlying.symbol}`
            })
            .join(' + ')
        }

        if (balance.category === 'perpetual') {
          d.margin = balance.margin ? parseFloatBI(balance.margin, decimals).toLocaleString() : undefinedA
          d.entryPrice = balance.entryPrice ? parseFloatBI(balance.entryPrice, decimals).toLocaleString() : undefined
          d.marketPrice = balance.marketPrice ? parseFloatBI(balance.marketPrice, decimals).toLocaleString() : undefined
          d.leverage = balance.leverage ? parseFloatBI(balance.leverage, decimals).toLocaleString() : undefined
        }

        data.push(d)
      } catch (error) {
        console.log('Failed to format balance', { balance, error })
      }
    }

    console.table(data)
  }
}

type ExtendedBalance = Balance & {
  groupIdx: number
}

export async function printBalancesConfig(balancesConfig: BalancesConfig) {
  // flatten balances and fetch their prices
  const balances: ExtendedBalance[] = balancesConfig.groups.flatMap((group, groupIdx) =>
    group.balances.map((balance) => ({ ...balance, groupIdx })),
  )

  const sanitizedBalances = sanitizeBalances(balances)

  const pricedBalances = (await getPricedBalances(sanitizedBalances)) as (PricedBalance & { groupIdx: number })[]

  console.log(`Found ${pricedBalances.length} non zero balances`)

  const balancesByGroupIdx = groupBy(pricedBalances, 'groupIdx')

  for (let groupIdx = 0; groupIdx < balancesConfig.groups.length; groupIdx++) {
    const balances = balancesByGroupIdx[groupIdx] || []
    const balanceBreakdowns = balances.map(fmtBalanceBreakdown)
    const balance = sum(balanceBreakdowns.map((balance) => balance.balanceUSD || 0))
    const reward = sum(balanceBreakdowns.map((balance) => balance.rewardUSD || 0))
    const debt = sum(balanceBreakdowns.map((balance) => balance.debtUSD || 0))
    const netWorth = balance - debt + reward
    const healthFactor = balancesConfig.groups[groupIdx].healthFactor || resolveHealthFactor(balanceBreakdowns)

    console.log(`\nGroup ${groupIdx}:`)
    console.table([
      {
        'net worth': `$${netWorth.toLocaleString()}`,
        balance: `$${balance.toLocaleString()}`,
        reward: `$${reward.toLocaleString()}`,
        debt: `$${debt.toLocaleString()}`,
        'health factor': healthFactor?.toLocaleString(),
      },
    ])
    printBalances(balances)
  }
}
