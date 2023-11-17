import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStakeContracts(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const assets = await multicall({
    ctx,
    calls: addresses.map((address) => ({ target: address }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assets, (res) => ({ chain: ctx.chain, address: res.input.target, token: res.output }))
}

export async function getSommelierStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const underlyingsAmount = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(underlyingsAmount, (res, index) => ({
    ...stakers[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
