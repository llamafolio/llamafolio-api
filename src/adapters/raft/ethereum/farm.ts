import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const R: Token = {
  chain: 'ethereum',
  address: '0x183015a9bA6fF60230fdEaDc3F43b3D788b13e21',
  decimals: 18,
  symbol: 'R',
}

export async function getRaftFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtUserBalance = await call({ ctx, target: farmer.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...farmer,
    amount: userBalance,
    underlyings: [{ ...R, amount: fmtUserBalance }],
    rewards: undefined,
    category: 'farm',
  }
}
