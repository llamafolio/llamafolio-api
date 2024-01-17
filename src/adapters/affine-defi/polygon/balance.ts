import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAffineBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userShareBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const userAssetBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(userShareBalances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(userAssetBalances, (res, index) => {
    const pool = pools[index]
    const underlying = pool.underlyings![0] as Contract

    return {
      ...pools[index],
      amount: res.input.params[0],
      underlyings: [{ ...underlying, amount: res.output }],
      rewards: undefined,
      category: 'farm',
    }
  })
}
