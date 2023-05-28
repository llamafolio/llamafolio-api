import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

import type { ProviderBalancesParams } from './interface'
import { uniswapBalancesProvider } from './uniswap'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const uniswapBoostedBalancesProvider = async (
  ctx: BalancesContext,
  pools: Contract[],
): Promise<ProviderBalancesParams[]> => {
  const calls: Call<typeof erc20Abi.balanceOf>[] = pools.map((pool) => ({
    target: pool.stakeAddress,
    params: [ctx.address],
  }))

  const [balancesOfRes, earnedsFXSRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const balanceOfRes = balancesOfRes[poolIdx]
    const earnedFXSRes = earnedsFXSRes[poolIdx]

    if (!balanceOfRes.success || !earnedFXSRes.success) {
      continue
    }

    pool.amount = balanceOfRes.output
    ;(pool.rewards?.[0] as Balance).amount = earnedFXSRes.output
  }

  return uniswapBalancesProvider(ctx, pools as ProviderBalancesParams[])
}
