import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  profitOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'profitOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WHITE: Token = {
  chain: 'ethereum',
  address: '0x5F0E628B693018f639D10e4A4F59BD4d8B2B6B44',
  decimals: 18,
  symbol: 'WHITE',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
  decimals: 6,
  symbol: 'USDC',
}

export async function getWhiteBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [amount, pendingReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.profitOf }),
  ])

  return {
    ...staker,
    amount,
    underlyings: [WHITE],
    rewards: [{ ...USDC, amount: pendingReward }],
    category: 'stake',
  }
}
