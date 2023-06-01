import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  balanceOf: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SUDO: Token = {
  chain: 'ethereum',
  address: '0x3446dd70b2d52a6bf4a5a192d9b0a161295ab7f9',
  decimals: 18,
  symbol: 'SUDO',
}

export async function getSudoFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance[]> {
  const [userBalance, pendingReward] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.balanceOf }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.earned }),
  ])

  const balance: Balance = {
    ...farmer,
    address: farmer.token!,
    amount: userBalance,
    underlyings: farmer.underlyings as Contract[],
    rewards: [{ ...SUDO, amount: pendingReward }],
    category: 'farm',
  }

  return getUnderlyingBalances(ctx, [balance])
}
