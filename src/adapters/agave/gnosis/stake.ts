import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const AGVE: Token = {
  chain: 'gnosis',
  address: '0x3a97704a1b25f08aa230ae53b352e2e72ef52843',
  decimals: 18,
  symbol: 'AGVE',
}

const abi = {
  getTotalRewardsBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getTotalRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAgaveStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getTotalRewardsBalance }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...AGVE, amount: userBalance }],
    rewards: [{ ...AGVE, amount: userReward }],
    category: 'stake',
  }
}
