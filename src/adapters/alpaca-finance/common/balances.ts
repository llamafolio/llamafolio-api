import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingAlpaca: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingAlpaca',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalToken: {
    inputs: [],
    name: 'totalToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  fairLaunch: Contract,
  alpaca: Contract,
) {
  const balances: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = pools.map((pool) => ({
    target: fairLaunch.address,
    params: [pool.pid, ctx.address],
  }))

  const supplyCalls: Call<typeof abi.totalSupply>[] = pools.map((pool) => ({ target: pool.token! }))

  const balanceOfCalls: Call<typeof erc20Abi.balanceOf>[] = pools.map((pool) => ({
    target: pool.token!,
    params: [ctx.address],
  }))

  const [userInfosRes, pendingRewardsRes, totalTokensRes, totalSuppliesRes, balancesOfRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingAlpaca }),
    multicall({ ctx, calls: supplyCalls, abi: abi.totalToken }),
    multicall({ ctx, calls: supplyCalls, abi: abi.totalSupply }),
    multicall({ ctx, calls: balanceOfCalls, abi: erc20Abi.balanceOf }),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const userInfoRes = userInfosRes[i]
    const pendingRewardRes = pendingRewardsRes[i]
    const totalTokenRes = totalTokensRes[i]
    const totalSupplyRes = totalSuppliesRes[i]
    const balanceOfRes = balancesOfRes[i]

    if (!userInfoRes.success || !totalTokenRes.success || !totalSupplyRes.success || totalSupplyRes.output == 0n) {
      continue
    }

    const [amount] = userInfoRes.output

    // farm
    if (userInfoRes.success) {
      const farmBalance: Balance = {
        ...(pool as Balance),
        amount: (amount * totalTokenRes.output) / totalSupplyRes.output,
        category: 'farm',
      }

      if (pendingRewardRes.success) {
        farmBalance.rewards = [{ ...alpaca, amount: pendingRewardRes.output }]
      }

      balances.push(farmBalance)
    }

    // lp
    if (balanceOfRes.success) {
      const lpBalance: Balance = {
        ...(pool as Balance),
        amount: (balanceOfRes.output * totalTokenRes.output) / totalSupplyRes.output,
        category: 'lp',
      }

      balances.push(lpBalance)
    }
  }

  return balances
}
