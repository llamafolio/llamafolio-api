import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  pendingEmissionToken: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingEmissionToken',
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

  const calls = range(0, pools.length).map((i) => ({
    target: lpStaking.address,
    params: [i, ctx.address],
  }))

  const [getBalances, getPendingRewards] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfos }),
    multicall({ ctx, calls, abi: abi.pendingEmissionToken }),
  ])

  const balances = getBalances.filter((res) => res.success).map((res) => BigNumber.from(res.output.amount))
  const pendingRewards = getPendingRewards.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const balance = balances[i]
    const reward = pool.rewards?.[0]
    const pendingReward = pendingRewards[i]

    if (!reward) {
      continue
    }

    poolsBalances.push({
      chain: ctx.chain,
      address: pool.address,
      decimals: pool.decimals,
      symbol: pool.symbol,
      amount: balance,
      rewards: [{ ...reward, amount: pendingReward }],
      yieldKey: pool.address,
      category: 'stake',
    })
  }

  return poolsBalances
}
