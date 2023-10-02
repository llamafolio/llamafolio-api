import type {
  Balance,
  BalancesContext,
  BaseContract,
  ExcludeRawContract,
  GetContractsHandler,
  LendBalance,
  PricedBalance,
} from '@lib/adapter'
import type { Category } from '@lib/category'
import { ADDRESS_ZERO } from '@lib/contract'
import { getBalancesOf } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

/**
 * Min and Max range for a balance unit (in USD).
 * Balances that don't fit in this range are discarded in the update balance process
 */
export const MIN_BALANCE_USD = 0.00001
export const MAX_BALANCE_USD = 10_000_000_000

export async function getBalances(ctx: BalancesContext, contracts: BaseContract[]) {
  const coins: Token[] = []
  const tokensByChain: { [key: string]: Token[] } = {}

  for (const token of contracts) {
    // native chain coin
    if (token.address === ADDRESS_ZERO) {
      coins.push(token as Token)
      continue
    }

    // token
    if (!tokensByChain[token.chain]) {
      tokensByChain[token.chain] = []
    }
    tokensByChain[token.chain]?.push(token as Token)
  }

  const tokensBalances: Token[] = (
    await Promise.all(
      Object.keys(tokensByChain).map(async (chain) => await getBalancesOf(ctx, coins.concat(tokensByChain[chain]))),
    )
  ).flat() as Token[]
  console.log({ tokensBalances })
  return tokensBalances
}

export async function multicallBalances(params: any) {
  const chain = params.ctx.chain
  const coinsCallsAddresses: string[] = []
  const tokensCalls = []
  const res = []

  for (const call of params.calls) {
    if (call.target === ADDRESS_ZERO) {
      // native chain coin
      // @ts-ignore
      coinsCallsAddresses.push(call.params[0])
    } else {
      // token
      tokensCalls.push(call)
    }
  }

  const coinsBalancesRes = await Promise.all(
    coinsCallsAddresses.map(async (address) => {
      try {
        // @ts-expect-error
        const provider = providers[chain]
        const balance = await provider.getBalance(address)
        return balance
      } catch (err) {
        console.error(`Failed to get coin balance for chain ${chain}`, err)
        return null
      }
    }),
  )

  const tokensBalancesRes = await multicall({
    ctx: params.ctx,
    calls: tokensCalls,
    abi: params.abi,
  })

  let coinIdx = 0
  let tokenIdx = 0
  for (let i = 0; i < params.calls.length; i++) {
    const call = params.calls[i]

    if (call.target === ADDRESS_ZERO) {
      // native chain coin
      res.push({
        success: coinsBalancesRes[coinIdx] != null,
        // @ts-ignore
        input: call,
        output: coinsBalancesRes[coinIdx]?.toString(),
      })
      coinIdx++
    } else {
      // token
      res.push(tokensBalancesRes[tokenIdx])
      tokenIdx++
    }
  }

  return res
}

export function sanitizeBalances<T extends Balance>(balances: T[]) {
  const sanitizedBalances: T[] = []

  for (const balance of balances) {
    if (balance.amount == null) {
      console.error(`Missing balance amount`, balance)
      continue
    }

    const sanitizedBalance = { ...balance }

    if (balance.underlyings) {
      if (balance.underlyings.length === 1 && (balance.underlyings?.[0] as Balance).amount == null) {
        if (balance.decimals && balance.underlyings[0].decimals) {
          const deltaMantissa = balance.decimals - balance.underlyings[0].decimals
          const deltaMantissaAbs = Math.abs(deltaMantissa)

          sanitizedBalance.underlyings = balance.underlyings.map((underlying) => ({
            ...underlying,
            amount:
              deltaMantissa > 0
                ? balance.amount / 10n ** BigInt(deltaMantissaAbs)
                : balance.amount * 10n ** BigInt(deltaMantissaAbs),
          }))
        }
      }
    }

    if (balance.rewards) {
      sanitizedBalance.rewards = balance.rewards.map((reward) => ({ ...reward, amount: reward.amount || 0n }))
    }

    sanitizedBalances.push(sanitizedBalance)
  }

  return sanitizedBalances
}

export function resolveHealthFactor(balances: (PricedBalance & BalanceBreakdown)[]) {
  let collateralUSD = 0
  let debtUSD = 0

  for (const balance of balances) {
    if (balance.category === 'lend') {
      const MCR = (balance as LendBalance).MCR
      const collateralFactor = (balance as LendBalance).collateralFactor
      if (MCR != null) {
        collateralUSD += (balance.collateralUSD || 0) / MCR
      } else if (collateralFactor != null) {
        collateralUSD += (balance.collateralUSD || 0) * parseFloatBI(collateralFactor, 18)
      }
    } else if (balance.category === 'borrow') {
      debtUSD += balance.debtUSD || 0
    }
  }

  return collateralUSD / debtUSD
}

export async function resolveBalances<C extends GetContractsHandler>(
  ctx: BalancesContext,
  contracts: ExcludeRawContract<Partial<Awaited<ReturnType<C>>['contracts']>>,
  resolvers: {
    [key in keyof Partial<Awaited<ReturnType<C>>['contracts']>]: (
      ctx: BalancesContext,
      contracts: ExcludeRawContract<Awaited<ReturnType<C>>['contracts']>[key],
    ) =>
      | Promise<Balance | Balance[] | Balance[][] | null | undefined>
      | Balance
      | Balance[]
      | Balance[][]
      | null
      | undefined
  },
) {
  const contractKeys = Object.keys(contracts)
  const balances = await Promise.all(
    contractKeys
      .filter((contractKey) => resolvers[contractKey] != null && contracts[contractKey] != null)
      .map(async (contractKey) => {
        try {
          const resolver = resolvers[contractKey]
          const balances = await resolver(ctx, contracts[contractKey]!)
          return balances
        } catch (error) {
          // Catch execution errors in adapters getBalances
          console.error(`[${ctx.adapterId}][${ctx.chain}] resolver ${contractKey} failed`, error)
          return null
        }
      }),
  )
  return balances.flat(2).filter(isNotNullish)
}

function isPricedBalanceInRange(balance: PricedBalance, key: 'balanceUSD' | 'claimableUSD' = 'balanceUSD') {
  const value = balance[key]
  return value != null && value >= MIN_BALANCE_USD && value <= MAX_BALANCE_USD
}

function isPricedBalanceLtMax(balance: PricedBalance, key: 'balanceUSD' | 'claimableUSD' = 'balanceUSD') {
  const value = balance[key]
  return value != null && value <= MAX_BALANCE_USD
}

export function sanitizePricedBalances<T extends PricedBalance>(balances: T[]) {
  const sanitizedBalances: T[] = []

  for (const balance of balances) {
    // Note: some LP tokens are not priced (only their underlyings), ex: uniswap-v3 (LP token is an NFT)
    if (!isPricedBalanceInRange(balance)) {
      continue
    }

    // sanitize rewards and underlyings
    balance.rewards = balance.rewards?.filter(
      (reward) => isPricedBalanceInRange(reward, 'balanceUSD') || isPricedBalanceInRange(reward, 'claimableUSD'),
    )
    balance.underlyings = balance.underlyings?.filter((underlying) => isPricedBalanceLtMax(underlying))

    sanitizedBalances.push(balance)
  }

  return sanitizedBalances
}

export interface SortBalance {
  balanceUSD?: number
  rewards?: SortBalance[]
  underlyings?: SortBalance[]
}

export function sortBalances(a: SortBalance, b: SortBalance) {
  if (a.rewards) {
    a.rewards = a.rewards.sort(sortBalances)
  }
  if (a.underlyings) {
    a.underlyings = a.underlyings.sort(sortBalances)
  }

  const aUSD = a.balanceUSD || 0
  const bUSD = b.balanceUSD || 0

  return bUSD - aUSD
}

export interface SumBalance {
  category?: Category
  claimableUSD?: number
  balanceUSD?: number
}

export function sumBalances(balances: SumBalance[]) {
  let res = 0

  for (const balance of balances) {
    // substract debt positions
    if (balance.category === 'borrow') {
      res -= balance.balanceUSD || 0
    } else {
      res += balance.claimableUSD || balance.balanceUSD || 0
    }
  }

  return res
}

export interface BalanceBreakdown {
  balanceUSD?: number
  collateralUSD?: number
  debtUSD?: number
  rewardUSD?: number
}

/**
 * Get debt, claimable and total of given balance
 */
export function fmtBalanceBreakdown(balance: PricedBalance): PricedBalance & BalanceBreakdown {
  let balanceUSD = 0
  let collateralUSD = 0
  let debtUSD = 0
  let rewardUSD = 0

  if (balance.category === 'borrow') {
    // don't count debt as balance
    debtUSD += balance.balanceUSD || 0
  } else if (balance.category === 'reward') {
    rewardUSD += balance.claimableUSD || balance.balanceUSD || 0
  } else if (balance.category === 'lend') {
    collateralUSD += balance.balanceUSD || 0
    balanceUSD += balance.balanceUSD || 0
  } else {
    balanceUSD += balance.balanceUSD || 0
  }

  // nested rewards
  if (balance.rewards) {
    for (const reward of balance.rewards) {
      rewardUSD += reward.claimableUSD || reward.balanceUSD || 0
    }
  }

  return {
    ...balance,
    balanceUSD: balanceUSD || undefined,
    collateralUSD: collateralUSD || undefined,
    debtUSD: debtUSD || undefined,
    rewardUSD: rewardUSD || undefined,
  }
}

export const BALANCE_UPDATE_THRESHOLD_SEC = 5 * 60

/**
 * At the moment, balances are considered "stale" if they haven't been updated in the last x minutes.
 * Later, we can use more advanced strategies using transactions events, scheduled updates etc
 * @param lastUpdateTimestamp
 */
export function areBalancesStale(lastUpdateTimestamp: number) {
  const now = new Date().getTime()

  return now - lastUpdateTimestamp > BALANCE_UPDATE_THRESHOLD_SEC * 1000
}
