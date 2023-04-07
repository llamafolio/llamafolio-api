import { selectRowsLatestBalancesGroupsWithBalancesByFromAddress } from '@db/balances-groups'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { ContractStandard } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { areBalancesStale, isBalanceUSDGtZero } from '@lib/balance'
import { isHex } from '@lib/buf'
import { Category } from '@lib/category'
import { invokeLambda } from '@lib/lambda'
import { APIGatewayProxyHandler } from 'aws-lambda'

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
      balanceUSD: underlying.balanceUSD,
      underlyings: undefined,
    }
  }

  return balance
}

export function formatBalance(balance: any): FormattedBalance {
  const formattedBalance: FormattedBalance = {
    standard: balance.standard,
    name: balance.name || undefined,
    address: balance.address,
    symbol: balance.symbol,
    decimals: balance.decimals,
    category: balance.category,
    stable: balance.stable,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    apy: balance.apy,
    apyBase: balance.apyBase,
    apyReward: balance.apyReward,
    apyMean30d: balance.apyMean30d,
    ilRisk: balance.ilRisk,
    unlockAt: balance.unlockAt,
    side: balance.side,
    margin: balance.margin,
    entryPrice: balance.entryPrice,
    marketPrice: balance.marketPrice,
    leverage: balance.leverage,
    funding: balance.funding,
    underlyings: balance.underlyings?.map(formatBalance),
    rewards: balance.rewards?.map(formatBalance),
  }

  return unwrapUnderlyings(formattedBalance)
}

interface GroupResponse {
  protocol: string
  chain: string
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
    const pricedBalances = await selectRowsLatestBalancesGroupsWithBalancesByFromAddress(client, address)

    const nonZeroPricedBalances = pricedBalances.filter(isBalanceUSDGtZero)

    const balancesByGroup = groupBy(nonZeroPricedBalances, 'id')

    const groups: GroupResponse[] = []

    for (const groupId in balancesByGroup) {
      groups.push({
        protocol: balancesByGroup[groupId][0].adapterId,
        chain: balancesByGroup[groupId][0].chain,
        healthFactor: balancesByGroup[groupId][0].healthFactor || undefined,
        balances: balancesByGroup[groupId].map(formatBalance),
      })
    }

    const updatedAt = pricedBalances[0]?.timestamp ? new Date(pricedBalances[0]?.timestamp).getTime() : undefined

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
      groups,
    }

    return success(balancesResponse, { maxAge: 20 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}
