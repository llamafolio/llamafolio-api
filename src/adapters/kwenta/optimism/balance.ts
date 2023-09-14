import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const KWENTA: Token = {
  chain: 'optimism',
  address: '0x920cf626a271321c151d027030d5d08af699456b',
  decimals: 18,
  symbol: 'KWENTA',
}

export async function getKwentaStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userPendingReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...KWENTA, amount: userPendingReward }],
    category: 'stake',
  }
}
