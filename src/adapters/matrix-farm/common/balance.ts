import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { parseEther } from 'viem'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMatrixFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userShares, pricePerFullShares] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: abi.getPricePerFullShare }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userShares.map((_, i) => [userShares[i], pricePerFullShares[i]]),

    (res, index) => {
      const pool = pools[index]
      const [{ output: share }, { output: pricePerFullShare }] = res.inputOutputPairs
      const assetBalance = BigInt(share * pricePerFullShare) / parseEther('1.0')

      return {
        ...(pool as Balance),
        amount: assetBalance,
        category: 'farm',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (pool) => pool.token! })
}
