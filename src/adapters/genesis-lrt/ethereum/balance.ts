import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  convertToAmount: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimlas: 18,
  symbol: 'WETH',
}

export async function getGenBalance(ctx: BalancesContext, genETH: Contract): Promise<Balance> {
  const shareBalance = await call({ ctx, target: genETH.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const assetBalance = await call({ ctx, target: genETH.address, params: [shareBalance], abi: abi.convertToAmount })

  return {
    ...genETH,
    amount: shareBalance,
    underlyings: [{ ...WETH, amount: assetBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
