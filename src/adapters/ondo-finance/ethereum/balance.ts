import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  lastSetMintExchangeRate: {
    inputs: [],
    name: 'lastSetMintExchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDC: Token = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  symbol: 'USDC',
}

export async function getOUSGStakeBalance(ctx: BalancesContext, staker: Contract, manager: Contract): Promise<Balance> {
  const [balances, exchangeRate] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: manager.address, abi: abi.lastSetMintExchangeRate }),
  ])

  return {
    ...staker,
    amount: balances,
    underlyings: [{ ...USDC, decimals: 18, amount: (balances * exchangeRate) / BigInt(Math.pow(10, 18)) }],
    rewards: undefined,
    category: 'stake',
  }
}
