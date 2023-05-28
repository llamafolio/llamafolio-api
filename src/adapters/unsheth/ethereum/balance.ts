import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

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
    outputs: [{ internalType: 'uint256[]', name: 'new_earned', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUnstEthFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const singleUnderlyingsBalances: Balance[] = []
  const multipleUnderlyingsBalances: Balance[] = []

  const calls: Call<typeof abi.lockedLiquidityOf>[] = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address],
  }))

  const [balancesOfsRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lockedLiquidityOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  pools.forEach((pool, poolIdx) => {
    const rewards = pool.rewards as Balance[]
    const underlyings = pool.underlyings as Balance[]
    const earned = earnedsRes[poolIdx]
    const balanceOf = balancesOfsRes[poolIdx]

    if (!underlyings || !rewards || !pool.token) {
      return
    }

    rewards.forEach((reward, idx) => {
      reward.amount = earned.success && earned.output.length > 0 ? BigNumber.from(earned.output[idx]) : BN_ZERO
    })

    const balance: Balance = {
      ...pool,
      address: pool.token,
      amount: balanceOf.success ? BigNumber.from(balanceOf.output) : BN_ZERO,
      rewards,
      underlyings,
      category: 'farm',
    }

    if (underlyings.length > 1) {
      multipleUnderlyingsBalances.push(balance)
    } else {
      singleUnderlyingsBalances.push(balance)
    }
  })

  const fmtUnderlyings = await getUnderlyingBalances(ctx, multipleUnderlyingsBalances)

  return [...singleUnderlyingsBalances, ...fmtUnderlyings]
}
