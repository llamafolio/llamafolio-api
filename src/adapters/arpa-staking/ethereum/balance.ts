import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getBaseReward: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getBaseReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getStake: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ARPA: Contract = {
  chain: 'ethereum',
  address: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
  decimals: 18,
  symbol: 'ARPA',
}

export async function getsARPABalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getStake }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getBaseReward }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...ARPA, amount: userReward }],
    category: 'stake',
  }
}
