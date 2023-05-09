import type {
  Balance,
  BalancesContext,
  BaseBalance,
  BaseContract,
  ExcludeRawContract,
  GetContractsHandler,
  PricedBalance,
} from '@lib/adapter'
import type { Category } from '@lib/category'
import { getERC20BalanceOf } from '@lib/erc20'
import { BN_TEN, BN_ZERO } from '@lib/math'
import type { Call, MultiCallOptions, MultiCallResult } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { ethers } from 'ethers'

export async function getBalances(ctx: BalancesContext, contracts: BaseContract[]) {
  const coins: Token[] = []
  const tokensByChain: { [key: string]: Token[] } = {}

  for (const token of contracts) {
    // native chain coin
    if (token.address === ethers.constants.AddressZero) {
      coins.push(token as Token)
      continue
    }

    // token
    if (!tokensByChain[token.chain]) {
      tokensByChain[token.chain] = []
    }
    tokensByChain[token.chain]?.push(token as Token)
  }

  const coinsBalances = (
    await Promise.all(
      coins.map(async (token) => {
        try {
          const provider = providers[token.chain]
          const balance = await provider.getBalance(ctx.address)
          ;(token as BaseBalance).amount = balance
          return token
        } catch (err) {
          console.error(`Failed to get coin balance for chain ${token.chain}`, err)
          return null
        }
      }),
    )
  ).filter(isNotNullish)

  const tokensBalances: Token[] = (
    await Promise.all(Object.keys(tokensByChain).map((chain) => getERC20BalanceOf(ctx, tokensByChain[chain])))
  ).flat() as Token[]

  return coinsBalances.concat(tokensBalances)
}

export async function multicallBalances(params: MultiCallOptions) {
  const chain = params.ctx.chain
  const coinsCallsAddresses: string[] = []
  const tokensCalls: Call[] = []
  const res: MultiCallResult[] = []

  for (const call of params.calls) {
    if (call.target === ethers.constants.AddressZero) {
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

    if (call.target === ethers.constants.AddressZero) {
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

export function sanitizeBalances(balances: Balance[]) {
  const sanitizedBalances: Balance[] = []

  for (const balance of balances) {
    if (!balance.amount) {
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
                ? balance.amount.div(BN_TEN.pow(deltaMantissaAbs))
                : balance.amount.mul(BN_TEN.pow(deltaMantissaAbs)),
          }))
        }
      }
    }

    if (balance.rewards) {
      sanitizedBalance.rewards = balance.rewards.map((reward) => ({
        ...reward,
        amount: reward.amount || BN_ZERO,
      }))
    }

    sanitizedBalances.push(sanitizedBalance)
  }

  return sanitizedBalances
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
          console.error(`[${ctx.adapterId}][${ctx.chain}] resolver ${contractKey} failed`, error)
          return null
        }
      }),
  )
  return balances.flat(2).filter(isNotNullish)
}

export function isBalanceUSDGtZero(balance: Balance | PricedBalance) {
  if ((balance as PricedBalance).price != null && ((balance as PricedBalance).balanceUSD || 0) > 1e-5) {
    return true
  }

  if (balance.underlyings) {
    for (const underlying of balance.underlyings) {
      if (((underlying as PricedBalance).price != null && (underlying as PricedBalance).balanceUSD) || 0 > 1e-5) {
        return true
      }
    }
  }

  if (balance.rewards) {
    for (const reward of balance.rewards) {
      if (
        (reward as PricedBalance).price != null &&
        (((reward as PricedBalance).claimableUSD || 0) > 0 || ((reward as PricedBalance).balanceUSD || 0) > 1e-5)
      ) {
        return true
      }
    }
  }

  return false
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
  debtUSD?: number
  rewardUSD?: number
}

/**
 * Get debt, claimable and total of given balance
 */
export function fmtBalanceBreakdown(balance: PricedBalance): PricedBalance & BalanceBreakdown {
  let balanceUSD = 0
  let debtUSD = 0
  let rewardUSD = 0

  if (balance.category === 'borrow') {
    debtUSD += balance.balanceUSD || 0
  } else if (balance.category === 'reward') {
    rewardUSD += balance.claimableUSD || balance.balanceUSD || 0
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
    debtUSD: debtUSD || undefined,
    rewardUSD: rewardUSD || undefined,
  }
}

/**
 * At the moment, balances are considered "stale" if they haven't been updated in the last x minutes.
 * Later, we can use more advanced strategies using transactions events, scheduled updates etc
 * @param lastUpdateTimestamp
 */
export function areBalancesStale(lastUpdateTimestamp: number) {
  const now = new Date().getTime()

  const updateInterval = 5 * 60 * 1000

  return now - lastUpdateTimestamp > updateInterval
}
