import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'pendingTokenReward', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const Onyx: Token = {
  chain: 'ethereum',
  address: '0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18',
  decimals: 18,
  symbol: 'XCN',
}

export async function getOnyxFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  lendingPool: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = pools.map((pool) => ({
    target: lendingPool.address,
    params: [pool.pid, ctx.address],
  }))

  const [balanceOfsRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const balanceOfRes = balanceOfsRes[poolIdx]
    const pendingRewardRes = pendingRewardsRes[poolIdx]

    if (!balanceOfRes.success || !pendingRewardRes.success) {
      continue
    }

    balances.push({
      ...pool,
      amount: balanceOfRes.output[0],
      underlyings: undefined,
      rewards: [{ ...Onyx, amount: pendingRewardRes.output }],
      category: 'farm',
    })
  }

  return balances
}
