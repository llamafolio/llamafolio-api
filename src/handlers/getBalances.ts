import { selectBalancesWithGroupsAndYieldsByFromAddress } from '@db/balances'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import type { ContractStandard } from '@lib/adapter'
import { areBalancesStale } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { Category } from '@lib/category'
import { invokeLambda } from '@lib/lambda'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface BaseFormattedBalance {
  standard?: ContractStandard
  name?: string
  address: string
  symbol?: string
  decimals?: number
  category: Category
  stable?: boolean
  price?: number
  amount?: string
  balanceUSD?: number
  rewardUSD?: number
  debtUSD?: number
  apy?: number
  apyBase?: number
  apyReward?: number
  apyMean30d?: number
  ilRisk?: boolean
  unlockAt?: number
  underlyings?: FormattedBalance[]
  rewards?: FormattedBalance[]
}

export interface PerpFormattedBalance extends BaseFormattedBalance {
  category: 'perpetual'
  side: 'long' | 'short'
  margin: string
  entryPrice: string
  marketPrice: string
  leverage: string
  funding: string
}

type FormattedBalance = BaseFormattedBalance | PerpFormattedBalance

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
      underlyings: undefined,
    }
  }

  return balance
}

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
    debtUSD: balance.debtUSD,
  }
}

export function formatBalance(balance: any): FormattedBalance {
  const formattedBalance: FormattedBalance = {
    standard: balance.data?.standard,
    name: balance.data?.name || undefined,
    address: balance.address,
    symbol: balance.data?.symbol,
    decimals: balance.data?.decimals != null ? parseInt(balance.data.decimals) : balance.data?.decimals,
    category: balance.category as Category,
    stable: balance.data?.stable,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    rewardUSD: balance.rewardUSD,
    debtUSD: balance.debtUSD,
    apy: balance.apy,
    apyBase: balance.apyBase,
    apyReward: balance.apyReward,
    apyMean30d: balance.apyMean30d,
    ilRisk: balance.ilRisk,
    unlockAt: balance.data?.unlockAt,
    side: balance.data?.side,
    margin: balance.data?.margin,
    entryPrice: balance.data?.entryPrice,
    marketPrice: balance.data?.marketPrice,
    leverage: balance.data?.leverage,
    funding: balance.data?.funding,
    underlyings: balance.data?.underlyings?.map(formatBaseBalance),
    rewards: balance.data?.rewards?.map(formatBaseBalance),
  }

  return unwrapUnderlyings(formattedBalance)
}

export function formatBalancesGroups(balancesGroups: any[]) {
  return balancesGroups.map((balancesGroup) => ({
    protocol: balancesGroup.adapterId,
    chain: balancesGroup.chain,
    balanceUSD: balancesGroup.balanceUSD,
    debtUSD: balancesGroup.debtUSD,
    rewardUSD: balancesGroup.rewardUSD,
    healthFactor: balancesGroup.healthFactor || undefined,
    balances: balancesGroup.balances.map(formatBalance),
  }))
}

interface GroupResponse {
  protocol: string
  chain: string
  balanceUSD: number
  debtUSD?: number
  rewardUSD?: number
  healthFactor?: number
  balances: FormattedBalance[]
}

export type TStatus = 'empty' | 'stale' | 'success'

export interface BalancesResponse {
  status: TStatus
  updatedAt?: number
  groups: GroupResponse[]
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
    const balancesGroups = await selectBalancesWithGroupsAndYieldsByFromAddress(client, address)

    const updatedAt = balancesGroups[0]?.timestamp ? new Date(balancesGroups[0]?.timestamp).getTime() : undefined

    let status: TStatus = 'success'
    if (updatedAt === undefined) {
      status = 'empty'
    } else if (areBalancesStale(updatedAt)) {
      status = 'stale'
    }

    if (status !== 'success') {
      await invokeLambda(`llamafolio-api-${process.env.stage}-updateBalances`, { address }, 'Event')
    }

    const balancesResponse: BalancesResponse = {
      status,
      updatedAt: updatedAt === undefined ? undefined : Math.floor(updatedAt / 1000),
      groups: formatBalancesGroups(balancesGroups),
    }

    return success(balancesResponse, { maxAge: 20 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}
