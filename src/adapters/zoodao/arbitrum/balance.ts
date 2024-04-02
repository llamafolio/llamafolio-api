import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ZOO: Contract = {
  chain: 'arbitrum',
  address: '0x1689a6e1f09658ff37d0bb131514e701045876da',
  decimals: 18,
  stmbol: 'ZOO',
}

export async function getZooBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userShares, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userShares.map((_, i) => [userShares[i], userRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlyings = pool.underlyings as Contract[]
      if (!underlyings) return null

      const [{ output: amount }, { output: pendingReward }] = res.inputOutputPairs

      return {
        ...pool,
        amount,
        underlyings,
        rewards: [{ ...ZOO, amount: pendingReward }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish)

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
