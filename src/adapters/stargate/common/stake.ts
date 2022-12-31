import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingStargate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  userInfos: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getStakeBalances(
  ctx: BalancesContext,
  pools: Contract[],
  lpStaking: Contract,
): Promise<Balance[]> {
  const poolsBalances: Balance[] = []

  const calls = pools.map((pool) => ({
    target: lpStaking.address,
    params: [pool.pid, ctx.address],
  }))

  const [userInfosRes, pendingRewardsRes] = await Promise.all([
    multicall({ chain: ctx.chain, calls, abi: abi.userInfos }),
    multicall({ chain: ctx.chain, calls, abi: abi.pendingReward }),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const amount = userInfosRes[i].success ? BigNumber.from(userInfosRes[i].output.amount) : BN_ZERO
    const reward = pool.rewards?.[0]

    const balance: Balance = {
      ...pool,
      amount,
      yieldKey: pool.address,
      category: 'stake',
    }

    if (reward) {
      const pendingReward = pendingRewardsRes[i].success ? BigNumber.from(pendingRewardsRes[i].output) : BN_ZERO
      balance.rewards = [{ ...reward, amount: pendingReward }]
    }

    poolsBalances.push(balance)
  }

  return poolsBalances
}
