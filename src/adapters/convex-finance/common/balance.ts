import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  get_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 9818,
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 41626,
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_underlying_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct ConvexRewardPool.EarnedData[]',
        name: 'claimable',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

export async function getConvexAltChainsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const poolBalances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = pools.flatMap((pool) =>
    pool.crvRewards.map(() => ({ target: pool.gauge, params: [ctx.address] })),
  )

  const [poolBalancesOfRes, pendingRewardsOfRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]

    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const crvRewards = pool.crvRewards

    if (!underlyings || !rewards) {
      continue
    }

    crvRewards.forEach((crvReward: `0x${string}`) => {
      const poolBalanceOfRes = poolBalancesOfRes.find((res) => res.input.target === crvReward)
      const pendingRewardOfRes = pendingRewardsOfRes.find((res) => res.input.target === crvReward)

      if (!poolBalanceOfRes || !pendingRewardOfRes || !poolBalanceOfRes.success || !pendingRewardOfRes.success) {
        return
      }

      const fmtRewards = rewards.map((reward, rewardIdx) => ({
        ...reward,
        amount: pendingRewardOfRes.output[rewardIdx].amount,
      }))

      poolBalances.push({
        ...pool,
        amount: poolBalanceOfRes.output,
        underlyings,
        rewards: fmtRewards,
        category: 'stake',
      })
    })
  }

  return (await getUnderlyingsPoolsBalances(ctx, poolBalances)).map((res) => ({ ...res, category: 'stake' }))
}
