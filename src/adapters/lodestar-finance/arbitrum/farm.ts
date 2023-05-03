import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'int128', name: 'lodeRewardDebt', type: 'int128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewards: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingRewards',
    outputs: [{ internalType: 'uint256', name: '_pendingLode', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const LODE: Token = {
  chain: 'arbitrum',
  address: '0xF19547f9ED24aA66b03c3a552D181Ae334FBb8DB',
  decimals: 18,
  symbol: 'LODE',
}

export async function getFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance[]> {
  const [{ output: userInfo }, { output: pendingReward }] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.pendingRewards }),
  ])

  const balance: Balance = {
    ...farmer,
    address: farmer.token as string,
    amount: BigNumber.from(userInfo.amount),
    underlyings: farmer.underlyings as Contract[],
    rewards: [{ ...LODE, amount: BigNumber.from(pendingReward) }],
    category: 'farm',
  }

  return getUnderlyingBalances(ctx, [balance])
}
