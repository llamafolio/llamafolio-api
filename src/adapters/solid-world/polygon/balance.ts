import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  balanceOf: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getAllUnclaimedRewardAmountsForUserAndAssets: {
    inputs: [
      { internalType: 'address[]', name: 'assets', type: 'address[]' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getAllUnclaimedRewardAmountsForUserAndAssets',
    outputs: [
      { internalType: 'address[]', name: 'rewardsList', type: 'address[]' },
      { internalType: 'uint256[]', name: 'unclaimedAmounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getTotalAmounts: {
    inputs: [],
    name: 'getTotalAmounts',
    outputs: [
      { internalType: 'uint256', name: 'total0', type: 'uint256' },
      { internalType: 'uint256', name: 'total1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSolidBalances(
  ctx: BalancesContext,
  pools: Contract[],
  controller: Contract,
  rewarder: Contract,
): Promise<Balance[]> {
  const [userBalances, tokenBalances, totalSupplies, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: controller.address, params: [pool.address, ctx.address] }) as const),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.getTotalAmounts,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: rewarder.address, params: [[pool.address], ctx.address] }) as const),
      abi: abi.getAllUnclaimedRewardAmountsForUserAndAssets,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], tokenBalances[i], totalSupplies[i], userRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const rawUnderlyings = pool.underlyings as Contract[]
      const rawRewards = pool.rewards as Contract[]
      const [{ output: amount }, { output: tokensBalances }, { output: supply }, { output: rewardBalances }] =
        res.inputOutputPairs

      if (!rawUnderlyings || !rawRewards || supply === 0n) return null

      const underlyings = rawUnderlyings.map((underlying, underlyingIdx) => {
        return { ...underlying, amount: (tokensBalances[underlyingIdx] * amount) / supply }
      })

      const rewards = rawRewards.map((reward) => {
        const [addressLists, amountLists] = rewardBalances
        const index = addressLists.findIndex(
          (address: `0x${string}`) => address.toLowerCase() === reward.address.toLowerCase(),
        )

        return {
          ...reward,
          amount: amountLists[index],
        }
      })

      return {
        ...pool,
        amount,
        underlyings,
        rewards,
        category: 'farm',
      }
    },
  ).filter(isNotNullish)
}
