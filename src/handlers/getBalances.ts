import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { ContractStandard } from '@lib/adapter'
import { areBalancesStale } from '@lib/balance'
import { isHex } from '@lib/buf'
import { Category } from '@lib/category'
import { Balance, BalancesGroup } from '@lib/indexer'
import { getBalancesGroups, HASURA_HEADERS } from '@lib/indexer'
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
    balanceUSD: balance.balance_usd,
  }
}

export function formatBalance(balancesGroup: BalancesGroup, balance: Balance): FormattedBalance {
  const _yield = balance.yields?.find(
    (_yield) => _yield.chain === balancesGroup.chain && _yield.adapter_id === balancesGroup.adapter_id,
  )

  const formattedBalance: FormattedBalance = {
    standard: balance.data?.standard,
    name: balance.data?.name || undefined,
    address: balance.address,
    symbol: balance.data?.symbol,
    decimals: balance.data?.decimals,
    category: balance.category as Category,
    stable: balance.data?.stable,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balance_usd,
    apy: _yield?.apy,
    apyBase: _yield?.apy_base,
    apyReward: _yield?.apy_reward,
    apyMean30d: _yield?.apy_mean_30d,
    ilRisk: _yield?.il_risk,
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

export function formatBalancesGroups(balancesGroups: BalancesGroup[]) {
  return balancesGroups.map((balancesGroup) => ({
    protocol: balancesGroup.adapter_id,
    chain: balancesGroup.chain,
    balanceUSD: balancesGroup.balance_usd,
    debtUSD: balancesGroup.debt_usd,
    rewardUSD: balancesGroup.reward_usd,
    healthFactor: balancesGroup.health_factor || undefined,
    balances: balancesGroup.balances.map((balance) => formatBalance(balancesGroup, balance)),
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
    const { balances_groups } = await getBalancesGroups({ fromAddress: address, headers: HASURA_HEADERS })

    const updatedAt = balances_groups[0]?.timestamp ? new Date(balances_groups[0]?.timestamp).getTime() : undefined

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
      groups: formatBalancesGroups(balances_groups),
    }

    return success(balancesResponse, { maxAge: 20 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}
