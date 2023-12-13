import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint128', name: 'unrealised', type: 'uint128' },
      { internalType: 'uint128', name: 'realised', type: 'uint128' },
      { internalType: 'uint192', name: 'accUnrealisedFractionPaid', type: 'uint192' },
      { internalType: 'uint64', name: 'lastDistributeIndex', type: 'uint64' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCleStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [unrealisedBalance] = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfo })

  return {
    ...staker,
    amount: unrealisedBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
