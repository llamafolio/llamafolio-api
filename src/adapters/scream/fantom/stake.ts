import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  getShareValue: {
    inputs: [],
    name: 'getShareValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SCREAM: Token = {
  chain: 'fantom',
  address: '0xe0654c8e6fd4d733349ac7e09f6f23da256bf475',
  decimals: 18,
  symbol: 'SCREAM',
}

export async function getScreamStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balanceOfRes, getShareValueRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.getShareValue }),
  ])

  return {
    ...staker,
    amount: (balanceOfRes * getShareValueRes) / parseEther('1.0'),
    underlyings: [SCREAM],
    rewards: undefined,
    category: 'stake',
  }
}
