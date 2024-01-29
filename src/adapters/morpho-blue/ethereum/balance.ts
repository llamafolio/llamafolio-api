import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMorphoBalances(ctx: BalancesContext, morphos: Contract[]): Promise<Balance[]> {
  const shareBalances = await multicall({
    ctx,
    calls: morphos.map((morpho) => ({ target: morpho.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })
  const assetBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(shareBalances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(assetBalances, (res, index) => {
    const morpho = morphos[index]
    const underlying = morpho.underlyings![0] as Contract
    const amount = res.input.params[0]

    return {
      ...morpho,
      amount,
      underlyings: [{ ...underlying, amount: res.output }],
      rewards: undefined,
      category: 'farm',
    }
  })
}
