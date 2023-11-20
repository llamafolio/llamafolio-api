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

export async function getAmphorBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const userRawBalances = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const assetBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(userRawBalances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(assetBalances, (res, index) => ({
    ...contracts[index],
    amount: res.input.params[0],
    underlyings: [{ ...(contracts[index].underlyings?.[0] as Contract), amount: res.output }],
    rewards: undefined,
    category: 'farm',
  }))
}
