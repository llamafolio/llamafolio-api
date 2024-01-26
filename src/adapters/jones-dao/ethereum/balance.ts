import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getJAuraFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const shareBalance = await call({
    ctx,
    target: farmer.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const assetBalance = await call({
    ctx,
    target: farmer.address,
    params: [shareBalance],
    abi: abi.convertToAssets,
  })

  return {
    ...farmer,
    amount: shareBalance,
    underlyings: [{ ...(farmer.underlyings![0] as Contract), amount: assetBalance }],
    rewards: undefined,
    category: 'farm',
  }
}
