import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers/lib/ethers'

import type { ProviderBalancesParams } from '../providers/interface'
import { curveBalancesProvider } from './providers/curve'
import { saddleBalancesProvider } from './providers/saddle'

const abi = {
  lockedLiquidityOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedLiquidityOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFraxBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.lockedLiquidityOf>[] = pools.map((pool) => ({
    target: pool.stakeAddress,
    params: [ctx.address],
  }))

  const [balancesOfsRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lockedLiquidityOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  pools.forEach((pool, poolIdx) => {
    const rewards = pool.rewards
    if (!rewards) {
      return
    }

    rewards.forEach((reward, idx) => {
      const earnedRes = earnedsRes[poolIdx]

      ;(reward as Balance).amount =
        earnedRes.success && earnedRes.output.length > 0 ? BigNumber.from(earnedRes.output[idx]) : BN_ZERO
    })

    const balanceOf = balancesOfsRes[poolIdx]

    balances.push({
      ...pool,
      amount: balanceOf.success ? BigNumber.from(balanceOf.output) : BN_ZERO,
      rewards: rewards as Balance[],
      underlyings: pool.underlyings as Contract[],
      category: 'farm',
    })
  })

  return underlyingsFraxBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: ProviderBalancesParams[]) => Promise<ProviderBalancesParams[]>

const providers: Record<string, Provider | undefined> = {
  curve: curveBalancesProvider,
  saddle: saddleBalancesProvider,
}

const underlyingsFraxBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as ProviderBalancesParams[])
      }),
    )
  ).flat()
}
