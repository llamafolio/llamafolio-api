import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalances } from '@lib/stake'
import type { Token } from '@lib/token'

const abi = {
  pendingMnt: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingMnt',
    outputs: [
      { internalType: 'uint256', name: 'pendingMNT', type: 'uint256' },
      { internalType: 'uint256', name: 'pendingReward', type: 'uint256' },
    ],
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
      { internalType: 'uint256', name: 'rewardFactor', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const MNT: Token = {
  chain: 'polygon',
  address: '0xe92175ea10fc1f59f633c77153e81780a6eeae04',
  symbol: 'MNT',
  decimals: 18,
}

export async function getLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  return (await getSingleStakeBalances(ctx, pools)).map((res) => ({ ...res, category: 'lp' }))
}

export async function getMantisFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = pools.map((_, idx) => ({
    target: masterChef.address,
    params: [BigInt(idx), ctx.address],
  }))

  const [userInfosRes, userPendingsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingMnt }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const userInfoRes = userInfosRes[poolIdx]
    const userPendingRes = userPendingsRes[poolIdx]

    if (!underlyings || !userInfoRes.success || !userPendingRes.success) {
      continue
    }

    balances.push({
      ...pool,
      amount: userInfoRes.output[0],
      underlyings,
      rewards: [{ ...MNT, amount: userPendingRes.output[0] }],
      category: 'farm',
    })
  }

  return balances
}
