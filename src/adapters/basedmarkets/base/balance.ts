import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'address', name: '_rewardsToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDbC: Contract = {
  chain: 'base',
  address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
  decimals: 6,
  symbol: 'USDbC',
}

export async function getBasedMarketsStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userPendingBased] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address, USDbC.address], abi: abi.earned }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...USDbC, amount: userPendingBased }],
    category: 'stake',
  }
}
