import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'convertToAssets',
    outputs: [
      {
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPodsFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] } as const)),
    abi: erc20Abi.balanceOf,
  })

  const userAssetsBalancesRes = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalancesRes, (res) => ({ target: res.input.target, params: [res.output] } as const)),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(userAssetsBalancesRes, (res, idx) => ({
    ...farmers[idx],
    amount: res.input.params[0],
    underlyings: [{ ...(farmers[idx].underlyings?.[0] as Contract), amount: res.output }],
    rewards: undefined,
    category: 'farm',
  }))
}
