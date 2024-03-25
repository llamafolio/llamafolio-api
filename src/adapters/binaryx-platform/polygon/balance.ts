import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  savedPrice: {
    inputs: [],
    name: 'savedPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBinaryxBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userShares, sharePrices] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: address }) as const),
      abi: abi.savedPrice,
    }),
  ])

  return mapMultiSuccessFilter(
    userShares.map((_, i) => [userShares[i], sharePrices[i]]),

    (res, index) => {
      const pool = pools[index]
      const [{ output: share }, { output: price }] = res.inputOutputPairs

      return {
        ...pool,
        amount: (share * price) / parseEther('1.0'),
        underlyings: undefined,
        rewards: undefined,
        category: 'farm',
      }
    },
  )
}
