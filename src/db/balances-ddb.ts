import { getBatchItem, getItem, putItem } from '@db/dynamo'
import type { Balance } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { areBalancesStale } from '@lib/balance'
import type { Category } from '@lib/category'
import { chainById } from '@lib/chains'
import { safeParseInt } from '@lib/fmt'
import { sum, sumBI } from '@lib/math'
import type { UnixTimestamp } from '@lib/type'

function formatBaseBalance(balance: any) {
  return {
    standard: balance.standard,
    name: balance.name,
    address: balance.address,
    symbol: balance.symbol,
    decimals: balance.decimals,
    category: balance.category as Category,
    stable: balance.stable,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    rewardUSD: balance.rewardUSD,
    collateralUSD: balance.collateralUSD,
    debtUSD: balance.debtUSD,
  }
}

export function formatBalance(balance: any) {
  const underlyings = balance.underlyings?.map(formatBaseBalance)
  const rewards = balance.rewards?.map(formatBaseBalance)

  const formattedBalance = {
    standard: balance.standard,
    name: balance.name,
    address: balance.address,
    symbol: balance.symbol,
    decimals: safeParseInt(balance.decimals),
    category: balance.category as Category,
    stable: Boolean(balance.stable || underlyings?.every((underlying: any) => underlying.stable)),
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    rewardUSD: balance.rewardUSD,
    collateralUSD: balance.collateralUSD,
    debtUSD: balance.debtUSD,
    MCR: balance.MCR,
    collateralFactor: balance.collateralFactor,
    apy: balance.apy,
    apyBase: balance.apyBase,
    apyReward: balance.apyReward,
    apyMean30d: balance.apyMean30d,
    ilRisk: balance.ilRisk,
    unlockAt: safeParseInt(balance.unlockAt),
    side: balance.side,
    margin: balance.margin,
    entryPrice: balance.entryPrice,
    marketPrice: balance.marketPrice,
    leverage: balance.leverage,
    funding: balance.funding,
    underlyings,
    rewards,
  }

  return formattedBalance
}

export function insertBalancesDDB({
  address,
  balances,
  updatedAt,
}: {
  address: `0x${string}`
  balances: Balance[]
  updatedAt: UnixTimestamp
}) {
  const PK = `BALANCES#${address}`

  return putItem({
    PK,
    SK: PK,
    address,
    balances,
    updatedAt,
  })
}

export function getBalancesDDB({ address }: { address: `0x${string}` }) {
  const PK = `BALANCES#${address}`

  return getItem({
    PK,
    SK: PK,
  })
}

export async function getBatchBalancesDDB({ addresses }: { addresses: `0x${string}`[] }) {
  const batchBalancesResponses = await getBatchItem<{
    PK: string
    SK: string
    address: string
    updatedAt: string
    balances: Balance[]
  }>(
    addresses.map((address) => {
      const PK = `BALANCES#${address}`

      return {
        PK,
        SK: PK,
      }
    }),
  )

  const updatedAtByFromAddress: { [key: string]: UnixTimestamp | undefined } = {}
  const protocolsBalances: any[] = []
  const balances: Balance[] = []

  for (const balancesResponse of batchBalancesResponses) {
    updatedAtByFromAddress[balancesResponse.address] = parseInt(balancesResponse.updatedAt)

    for (const balance of balancesResponse.balances) {
      balances.push(balance)
    }
  }

  const balancesByChain = groupBy(balances, 'chain')

  for (const chain in balancesByChain) {
    if (!chainById[chain]) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    // Group balances by protocol
    const balancesByProtocol = groupBy(balancesByChain[chain], 'adapterId')

    for (const protocolId in balancesByProtocol) {
      const balances = balancesByProtocol[protocolId]

      const protocolBalances: any = {
        id: protocolId,
        chain,
        balanceUSD: sum(balances.map((balance) => balance.balanceUSD || 0)),
        debtUSD: sum(balances.map((balance) => balance.debtUSD || 0)),
        rewardUSD: sum(balances.map((balance) => balance.rewardUSD || 0)),
        groups: [],
      }

      // Aggregate wallet balances of each holder:
      // - sum tokens
      if (protocolId === 'wallet') {
        const tokensByAddress = groupBy(balances, 'address')
        const groupBalances: any[] = []

        for (const address in tokensByAddress) {
          const tokens = tokensByAddress[address]

          groupBalances.push({
            standard: tokens[0].standard,
            name: tokens[0].name,
            address: tokens[0].address,
            symbol: tokens[0].symbol,
            decimals: tokens[0].decimals,
            stable: tokens[0].stable,
            price: tokens[0].price,
            amount: sumBI(tokens.map((balance) => BigInt(balance.amount || 0))).toString(),
            balanceUSD: tokens[0].price != null ? sum(tokens.map((balance) => balance.balanceUSD || 0)) : undefined,
          })
        }

        protocolBalances.groups.push({
          balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
          balances: groupBalances,
        })
      } else {
        // Group balances by holder for all protocols but preserve each holder's groups (don't aggregate them) as it can be ambiguous.
        // Ex: lend/borrow "groups" look incorrect if we aggregate them as the holder may think the
        // collateral value is higher/lower
        const balancesByFromAddress = groupBy(balances, 'fromAddress')

        for (const fromAddress in balancesByFromAddress) {
          const balancesByGroupIdx = groupBy(balancesByFromAddress[fromAddress], 'groupIdx')

          for (const groupIdx in balancesByGroupIdx) {
            const groupBalances = balancesByGroupIdx[groupIdx].map(formatBalance)

            protocolBalances.groups.push({
              fromAddress,
              balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
              debtUSD: sum(groupBalances.map((balance) => balance.debtUSD || 0)),
              rewardUSD: sum(groupBalances.map((balance) => balance.rewardUSD || 0)),
              healthFactor: balancesByGroupIdx[groupIdx][0].healthFactor,
              balances: groupBalances,
            })
          }
        }
      }

      protocolsBalances.push(protocolBalances)
    }
  }

  // updatedAt is undefined if any of the address has never been updated or the oldest updatedAt of all balances
  let updatedAt: number | undefined
  for (const address in updatedAtByFromAddress) {
    const addressUpdatedAt = updatedAtByFromAddress[address]
    if (addressUpdatedAt == null) {
      updatedAt = undefined
      break
    }

    if (updatedAt != null) {
      updatedAt = Math.min(updatedAt, addressUpdatedAt)
    } else {
      updatedAt = updatedAtByFromAddress[address]
    }
  }

  const staleAddresses = Object.keys(updatedAtByFromAddress).filter(
    (address) => updatedAtByFromAddress[address] == null || areBalancesStale(updatedAtByFromAddress[address]!),
  )

  return { updatedAt, protocolsBalances, staleAddresses }
}
