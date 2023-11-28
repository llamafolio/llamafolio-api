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

export async function getMevBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const userAssetBalance = await call({ ctx, target: staker.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...(staker.underlyings![0] as Contract), amount: userAssetBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
