import { BigNumber } from 'ethers'
import millify from 'millify'
import fetch from 'node-fetch'
import path from 'path'

import { Adapter, BaseContext, PricedBalance } from '../src/lib/adapter'
import { sanitizeBalances } from '../src/lib/balance'
import { chains } from '../src/lib/chains'
import { getPricedBalances } from '../src/lib/price'

interface CategoryBalances {
  title: string
  totalUSD: number
  balances: PricedBalance[]
}

Object.defineProperties(BigNumber.prototype, {
  toJSON: {
    value: function (this: BigNumber) {
      return this.toString()
    },
  },
})

function help() {
  console.log('npm run adapter {address}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: run-adapter.ts
  // argv[2]: adapter
  // argv[3]: address

  const startTime = Date.now()

  if (process.argv.length < 3) {
    console.error('Missing adapter argument')
    return help()
  }
  if (process.argv.length < 4) {
    console.error('Missing address argument')
    return help()
  }
  const address = process.argv[3].toLowerCase()

  const ctx: BaseContext = { address }

  const adapterId = process.argv[2].replace('-', '/')

  const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
  const adapter = module.default as Adapter

  const contractsRes = await adapter.getContracts()

  const balancesRes = await adapter.getBalances(ctx, contractsRes.contracts || [])
  const sanitizedBalances = sanitizeBalances(balancesRes.balances)

  const yieldsRes = await fetch('https://yields.llama.fi/poolsOld')
  const yieldsData = (await yieldsRes.json()).data

  const yieldsByPoolAddress: { [key: string]: any } = {}
  const yieldsByKeys: { [key: string]: any } = {}
  const yieldsByNewKeys: { [key: string]: any } = {}

  for (let i = 0; i < yieldsData.length; i++) {
    yieldsByPoolAddress[yieldsData[i].pool_old.toLowerCase()] = yieldsData[i]
    yieldsByKeys[yieldsData[i].pool_old] = yieldsData[i]
    yieldsByNewKeys[yieldsData[i].pool] = yieldsData[i]
  }

  const pricedBalances = await getPricedBalances(sanitizedBalances)

  console.log(`Found ${pricedBalances.length} non zero balances`)

  // group by category
  const balancesByCategory: Record<string, PricedBalance[]> = {}
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
      const key = `${balance.yieldKey?.toLowerCase()}-${balance.chain === 'avax' ? 'avalanche' : balance.chain}`
      const subKey = `${balance.yieldKey?.toLowerCase()}`
      const nonAddressKey = `${balance.yieldKey}` //in a case where a yields key may be a string instead of an address
      const newKey = `${balance.yieldKey?.toLowerCase()}` //new unique identifiers recently introduced on llamayield

      const yieldObject =
        yieldsByNewKeys[newKey] ||
        yieldsByPoolAddress[key] ||
        yieldsByPoolAddress[subKey] ||
        yieldsByKeys[nonAddressKey]

      const decimals = balance.decimals ? 10 ** balance.decimals : 1

      const d = {
        chain: balance.chain,
        address: balance.address,
        category: balance.category,
        symbol: balance.symbol,
        balance: millify(balance.amount.div(decimals.toString()).toNumber()),
        balanceUSD: `$${millify(balance.balanceUSD !== undefined ? balance.balanceUSD : 0)}`,
        yield: `${yieldObject !== undefined ? yieldObject?.apy.toFixed(2) + '%' : '-'}`,
        il: `${yieldObject !== undefined ? yieldObject?.ilRisk : '-'}`,
        stable: balance.stable,
        type: balance.type,
        reward: '',
        underlying: '',
      }

      if (balance.rewards) {
        d.reward = balance.rewards
          .map((reward) => {
            const decimals = reward.decimals ? 10 ** reward.decimals : 1

            return `${millify(reward.amount.div(decimals.toString()).toNumber())} ${reward.symbol}`
          })
          .join(' + ')
      }

      if (balance.underlyings) {
        d.underlying = balance.underlyings
          .map((underlying) => {
            const decimals = underlying.decimals ? 10 ** underlying.decimals : 1

            return `${millify(underlying.amount.div(decimals.toString()).toNumber())} ${underlying.symbol}`
          })
          .join(' + ')
      }

      data.push(d)
    }

    console.table(data)
  }

  const metadata: any[] = []
  for (const chain of chains) {
    if (balancesRes[chain.id] && balancesRes[chain.id]?.healthFactor !== undefined) {
      metadata.push({ chain: chain.id, ...balancesRes[chain.id] })
    }
  }
  console.log('Metadata:')
  console.table(metadata)

  const endTime = Date.now()
  console.log(`Completed in ${endTime - startTime}ms`)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
