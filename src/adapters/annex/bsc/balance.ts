import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  userInfo: {
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
  pendingReward: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'pending',
    outputs: [
      {
        internalType: 'uint256',
        name: 'pending',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ANN: Token = {
  chain: 'bsc',
  address: '0x98936bde1cf1bff1e7a8012cee5e2583851f2067',
  decimals: 18,
  symbol: 'ANN',
}

export async function getAnnexFarmBalances(ctx: BalancesContext, masterchefPools: Contract[]): Promise<Balance[]> {
  const poolsBalances: Balance[] = []
  const singleBalances: Balance[] = []

  const rewardTokenName = masterchefPools.map((master) =>
    master.masterchef === '0x95660cc9fdf5e55c579101f5867b89f24f254ea1' ? 'Reward' : 'Annex',
  )

  const pendingReward: typeof abi.pendingReward = JSON.parse(
    JSON.stringify(abi.pendingReward).replace(
      'pending',
      rewardTokenName.length === 0 ? `pending` : `pending${rewardTokenName[0]}`,
    ),
  )

  const calls: Call<typeof abi.userInfo>[] = []
  for (let poolIdx = 0; poolIdx < masterchefPools.length; poolIdx++) {
    const masterchefPool = masterchefPools[poolIdx]
    calls.push({ target: masterchefPool.masterchef, params: [masterchefPool.pid, ctx.address] })
  }

  const [poolsBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: pendingReward }),
  ])

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const masterchefPool = masterchefPools[userIdx]
    const poolBalanceRes = poolsBalancesRes[userIdx]
    const pendingRewardRes = pendingRewardsRes[userIdx]

    if (!poolBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const balance: Balance = {
      ...masterchefPool,
      underlyings: masterchefPool.underlyings as Contract[],
      category: 'farm',
      amount: poolBalanceRes.output[0],
      rewards: [{ ...ANN, amount: pendingRewardRes.output }],
    }

    if (!balance.underlyings) {
      singleBalances.push(balance)
    } else {
      poolsBalances.push(balance)
    }
  }

  return (await Promise.all([singleBalances, getUnderlyingBalances(ctx, poolsBalances)])).flat()
}
