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

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 8,
  symbol: 'WETH',
}

export async function getDineroStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtUserBalances = await call({ ctx, target: staker.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...WETH, amount: fmtUserBalances, decimals: staker.decimals }],
    rewards: undefined,
    category: 'stake',
  }
}
