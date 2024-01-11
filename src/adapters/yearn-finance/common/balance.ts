import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { parseEther } from 'viem'

const abi = {
  pricePerShare: {
    stateMutability: 'view',
    type: 'function',
    name: 'pricePerShare',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 43519,
  },
  convertToAssets: {
    stateMutability: 'view',
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: '_shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  deposits: {
    stateMutability: 'view',
    type: 'function',
    name: 'deposits',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 8,
  symbol: 'WETH',
}

type PoolBalances = Balance & {
  pricePerFullShare: number
}

export async function getYearnBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address }) as const),
      abi: abi.pricePerShare,
    }),
  ])

  const poolBalances: PoolBalances[] = mapSuccessFilter(userBalancesRes, (res, index) => {
    const vault = vaults[index] as Balance
    const exchangeRate = exchangeRatesRes[index].success ? exchangeRatesRes[index].output : 1n
    const pricePerFullShare = parseFloatBI(exchangeRate!, vault.decimals!)

    if (res.output === 0n) return null

    return {
      ...vault,
      amount: res.output,
      token: vault.token,
      pricePerFullShare,
      rewards: undefined,
      category: 'farm' as Category,
    }
  }).filter(isNotNullish)

  return getUnderlyingsBalances(ctx, poolBalances)
}

async function getUnderlyingsBalances(ctx: BalancesContext, pools: PoolBalances[]): Promise<PoolBalances[]> {
  const pairBalances = await getUnderlyingBalances(ctx, pools, { getAddress: (c) => c.token! })
  return AdjustUnderlyingsAmount(await getCurveUnderlyingsBalances(ctx, pairBalances))
}

function calculateAdjustedAmount(originalAmount: bigint, pricePerFullShare: number, scaleFactor: number) {
  if (typeof originalAmount !== 'undefined') {
    return BigInt(Number(originalAmount) * pricePerFullShare * scaleFactor) / parseEther('1.0')
  }
  return originalAmount
}

export function AdjustUnderlyingsAmount(pools: PoolBalances[]): PoolBalances[] {
  const scaleFactor = 10 ** 18

  return pools.map((pool) => {
    if (!pool.underlyings || pool.underlyings.length === 0) {
      return pool
    }

    const adjustedUnderlyings = pool.underlyings.map((underlying: Contract) => {
      const amountToAdjust = underlying.amount || pool.amount
      return {
        ...underlying,
        amount: calculateAdjustedAmount(amountToAdjust, pool.pricePerFullShare, scaleFactor),
      }
    })

    return {
      ...pool,
      underlyings: adjustedUnderlyings,
    }
  })
}

export async function getYearnStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtUserBalances = await call({ ctx, target: staker.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...WETH, amount: fmtUserBalances, decimals: staker.decimals }],
    rewards: undefined,
    category: 'stake',
  }
}

export async function getVeYearnBalance(ctx: BalancesContext, depositer: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: depositer.address, params: [ctx.address], abi: abi.deposits })
  const fmtUserBalances = await call({ ctx, target: depositer.token!, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...depositer,
    amount: userBalance,
    underlyings: [{ ...WETH, amount: fmtUserBalances, decimals: 18 }],
    rewards: undefined,
    category: 'stake',
  }
}
