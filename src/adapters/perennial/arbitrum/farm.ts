import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'UFixed18', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'UFixed18', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDC: Token = {
  chain: 'arbitrum',
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 6,
  symbol: 'USDC',
}

export async function getPVAFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const balanceOfRes = await call({
    ctx,
    target: farmer.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const fmtBalances = await call({
    ctx,
    target: farmer.address,
    params: [balanceOfRes],
    abi: abi.convertToAssets,
  })

  return {
    ...farmer,
    amount: fmtBalances,
    underlyings: [USDC],
    rewards: undefined,
    category: 'farm',
  }
}
