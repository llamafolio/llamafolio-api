import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
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
      { internalType: 'uint128', name: 'shares', type: 'uint128' },
      { internalType: 'uint128', name: 'rewards', type: 'uint128' },
      { internalType: 'uint256', name: 'rewardPerSharePaid', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingCTR: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_account', type: 'address' },
    ],
    name: 'pendingCTR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_account', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getFarmBalances(ctx: BalancesContext, vault: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const pools = vault.pools

  const calls: Call<typeof abi.userInfo>[] = []
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    calls.push({ target: vault.address, params: [BigInt(poolIdx), ctx.address] })
  }

  const [userInfosBalancesRes, pendingRewardRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const rewards = pool.rewards as Contract[]
    const userInfoBalance = userInfosBalancesRes[poolIdx]
    const pendingReward = pendingRewardRes[poolIdx]

    if (!rewards || !userInfoBalance.success || userInfoBalance.output[0] === 0n) {
      continue
    }

    if (pool.pid == userInfoBalance.input.params?.[0]) {
      balances.push({
        ...pool,
        underlyings: pool.underlyings as Balance[],
        amount: userInfoBalance.output[0],
        rewards: [{ ...rewards[0], amount: pendingReward.output }],
      })
    }
  }

  return (await getUnderlyingsPoolsBalances(ctx, balances, metaRegistry)).map((pool) => ({
    ...pool,
    category: 'farm',
  }))
}
