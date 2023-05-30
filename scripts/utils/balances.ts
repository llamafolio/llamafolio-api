import type { PricedBalance } from '../../src/lib/adapter'
import { groupBy } from '../../src/lib/array'
import { millify, millifyBI } from '../../src/lib/fmt'

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
          stable: balance.stable,
        }

        if (balance.claimable) {
          d.claimable = balance.claimable ? millifyBI(balance.claimable / decimals) : undefined
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
