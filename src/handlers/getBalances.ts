import { selectBalancesByFromAddress } from '@db/balances'
import { selectLastBalancesSnapshotsByFromAddress } from '@db/balances-snapshots'
import pool from '@db/pool'
import { client as redisClient } from '@db/redis'
import { selectYieldsByKeys } from '@db/yields'
import { badRequest, serverError, success } from '@handlers/response'
import { Balance, ContractStandard } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { isHex } from '@lib/buf'
import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
import { isNotNullish } from '@lib/type'
import { APIGatewayProxyHandler } from 'aws-lambda'
import { Redis } from 'ioredis'

/**
 * Add yields info to given balances
 */
async function getBalancesYields<T extends Balance>(client: Redis, balances: T[]): Promise<T[]> {
  const yieldKeys = balances.map((balance) => balance.yieldKey).filter(isNotNullish)

  const yieldsByKey = await selectYieldsByKeys(client, yieldKeys)

  for (const balance of balances) {
    if (!balance.yieldKey) {
      continue
    }

    const _yield = yieldsByKey[balance.yieldKey]
    if (!_yield) {
      continue
    }

    balance.apy = _yield.apy
    balance.apyBase = _yield.apyBase
    balance.apyReward = _yield.apyReward
    balance.apyMean30d = _yield.apyMean30d
    balance.ilRisk = _yield.ilRisk
  }

  return balances
}

export interface FormattedBalance {
  standard?: ContractStandard
  name?: string
  chain: Chain
  address: string
  symbol?: string
  decimals?: number
  category: Category
  adapterId: string
  stable?: boolean
  price?: number
  amount?: string
  balanceUSD?: number
  apy?: number
  apyBase?: number
  apyReward?: number
  apyMean30d?: number
  ilRisk?: boolean
  timestamp?: number
  underlyings?: FormattedBalance[]
  rewards?: FormattedBalance[]
}

/**
 * If there's only one underlying, replace balance by its underlying
 * @param balance
 */
function unwrapUnderlyings(balance: FormattedBalance) {
  if (balance.underlyings?.length === 1) {
    const underlying = balance.underlyings[0]

    return {
      ...balance,
      address: underlying.address,
      symbol: underlying.symbol,
      decimals: underlying.decimals,
      stable: underlying.stable,
      price: underlying.price,
      amount: underlying.amount,
      balanceUSD: underlying.balanceUSD,
      underlyings: undefined,
    }
  }

  return balance
}

export function formatBalance(balance: any): FormattedBalance {
  const formattedBalance: FormattedBalance = {
    type: balance.type,
    standard: balance.standard,
    name: balance.name,
    chain: balance.chain,
    address: balance.address,
    symbol: balance.symbol,
    decimals: balance.decimals,
    category: balance.category,
    adapterId: balance.adapterId,
    stable: balance.stable,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    apy: balance.apy,
    apyBase: balance.apyBase,
    apyReward: balance.apyReward,
    apyMean30d: balance.apyMean30d,
    ilRisk: balance.ilRisk,
    timestamp: balance.timestamp,
    underlyings: balance.underlyings?.map(formatBalance),
    rewards: balance.rewards?.map(formatBalance),
  }

  return unwrapUnderlyings(formattedBalance)
}

export interface BalancesProtocolChainResponse {
  id: Chain
  balances: FormattedBalance[]
  healthFactor?: number
}

export interface BalancesProtocolResponse {
  id: string
  chains: BalancesProtocolChainResponse[]
}

export interface BalancesResponse {
  updatedAt: number
  protocols: BalancesProtocolResponse[]
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = await pool.connect()

  try {
    const [pricedBalances, lastBalancesSnapshots] = await Promise.all([
      selectBalancesByFromAddress(client, address),
      selectLastBalancesSnapshotsByFromAddress(client, address),
    ])

    const pricedBalancesWithYields = await getBalancesYields(redisClient, pricedBalances)

    const protocols: BalancesProtocolResponse[] = []
    const balancesByAdapterId = groupBy(pricedBalancesWithYields, 'adapterId')
    const balancesSnapshotsByAdapterId = groupBy(lastBalancesSnapshots, 'adapterId')

    for (const adapterId in balancesByAdapterId) {
      const balancesByChain = groupBy(balancesByAdapterId[adapterId], 'chain')
      const balancesSnapshotsByChain = groupBy(balancesSnapshotsByAdapterId[adapterId] || [], 'chain')

      const chains: BalancesProtocolChainResponse[] = []

      for (const chain in balancesByChain) {
        const balanceSnapshot = balancesSnapshotsByChain[chain]?.[0]

        chains.push({
          id: chain as Chain,
          balances: balancesByChain[chain].map(formatBalance),
          healthFactor: balanceSnapshot?.healthFactor,
        })
      }

      protocols.push({
        id: adapterId,
        chains,
      })
    }

    const updatedAt = pricedBalances[0]?.timestamp

    const balancesResponse: BalancesResponse = {
      updatedAt,
      protocols,
    }

    return success(balancesResponse, { maxAge: 60 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}
