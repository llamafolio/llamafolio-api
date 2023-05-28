import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  getUnderlyingByCToken: {
    inputs: [{ internalType: 'uint256', name: '_cTokenAmount', type: 'uint256' }],
    name: 'getUnderlyingByCToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

export async function getTProtocolBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const userBalanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const fmtBalance = await call({
    ctx,
    target: contract.address,
    params: [userBalanceOf],
    abi: abi.getUnderlyingByCToken,
  })

  return {
    ...contract,
    decimals: 18,
    amount: userBalanceOf,
    underlyings: [{ ...USDC, amount: fmtBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
