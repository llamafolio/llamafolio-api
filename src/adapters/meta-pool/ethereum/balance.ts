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

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getmpETHBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const shareBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const assetBalance = await call({ ctx, target: staker.address, params: [shareBalance], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: shareBalance,
    underlyings: [{ ...WETH, amount: assetBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
