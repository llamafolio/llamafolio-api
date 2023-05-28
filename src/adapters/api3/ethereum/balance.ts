import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  userStake: {
    inputs: [{ internalType: 'address', name: 'userAddress', type: 'address' }],
    name: 'userStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const api3Token: Token = {
  chain: 'ethereum',
  address: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
  decimals: 18,
  symbol: 'API3',
}

export async function getApi3StakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userStake = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userStake })

  return {
    ...staker,
    symbol: api3Token.symbol,
    decimals: api3Token.decimals,
    amount: userStake,
    underlyings: [api3Token],
    rewards: undefined,
    category: 'stake',
  }
}
