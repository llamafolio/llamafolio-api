import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface OutputResponse {
  output: bigint
}

export async function getLocusFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userShares, pricePerShares] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: abi.pricePerShare }),
  ])

  return mapMultiSuccessFilter(
    userShares.map((_, i) => [userShares[i], pricePerShares[i]]),
    (res, index) => {
      const pool = pools[index]
      const [{ output: share }, { output: pricePerShare }] = res.inputOutputPairs as OutputResponse[]

      return {
        ...pool,
        amount: (share * pricePerShare) / 10n ** BigInt(pool.decimals!),
        underlyings: undefined,
        rewards: undefined,
        category: 'farm',
      }
    },
  )
}
