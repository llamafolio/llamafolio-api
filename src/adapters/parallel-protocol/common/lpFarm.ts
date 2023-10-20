import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      { internalType: 'uint256', name: 'amount0Current', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1Current', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  stake: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'stake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingMIMO: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingMIMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getParallelLpFarmBalances(ctx: BalancesContext, lpFarmers: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes, underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.stake,
    }),
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.pendingMIMO,
    }),
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.token! }) as const),
      abi: abi.getUnderlyingBalances,
    }),
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.token! }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [
      userBalancesRes[i],
      userPendingRewardsRes[i],
      underlyingsBalancesRes[i],
      totalSuppliesRes[i],
    ]),
    (res, index) => {
      const lpFarmer = lpFarmers[index]
      const { underlyings, rewards } = lpFarmer as { underlyings: Contract[]; rewards: Contract[] }

      if (!underlyings || !rewards) return null

      const [
        { output: userBalance },
        { output: userPendingReward },
        { output: underlyingsBalances },
        { output: totalSupply },
      ] = res.inputOutputPairs

      if (totalSupply === 0n) return null

      const updateUnderlyings = underlyings.map((underlying, x) => ({
        ...underlying,
        amount: (userBalance * underlyingsBalances[x]) / totalSupply,
      }))

      return {
        ...lpFarmer,
        amount: userBalance,
        underlyings: updateUnderlyings,
        rewards: [{ ...rewards?.[0], amount: userPendingReward }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish) as Balance[]
}
