import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDM: Contract = {
  chain: 'ethereum',
  address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
  decimals: 18,
  symbol: 'USDM',
}

export async function getMountainBalance(ctx: BalancesContext, wUSDM: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: wUSDM.address,
    params: [ctx.address] as const,
    abi: erc20Abi.balanceOf,
  })

  const underlyingsAmount = await call({ ctx, target: wUSDM.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...wUSDM,
    amount: userBalance,
    underlyings: [{ ...USDM, amount: underlyingsAmount }],
    rewards: undefined,
    category: 'farm',
  }
}
