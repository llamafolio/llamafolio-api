import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: '_sharesAmount', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCygnusBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userShares = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const poolBalances: Balance[] = mapSuccessFilter(userShares, (res, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings

    return {
      ...pool,
      amount: res.output,
      underlyings,
      rewards: undefined,
      category: 'farm',
    }
  })

  const userAssets = await multicall({
    ctx,
    calls: poolBalances.map((pool) => ({ target: pool.token ?? pool.address, params: [pool.amount] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(userAssets, (res, index) => {
    const poolBalance = poolBalances[index]
    const underlying = poolBalance.underlyings![0] as Contract
    return { ...poolBalance, underlyings: [{ ...underlying, amount: res.output }] }
  })
}
