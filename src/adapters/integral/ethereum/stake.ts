import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getUserStakes: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint32', name: 'startBlock', type: 'uint32' },
          { internalType: 'uint32', name: 'claimedBlock', type: 'uint32' },
          { internalType: 'uint96', name: 'lockedAmount', type: 'uint96' },
          { internalType: 'bool', name: 'withdrawn', type: 'bool' },
        ],
        internalType: 'struct IIntegralStaking.UserStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getIntegralStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const userStakes = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getUserStakes })

  return (userStakes || []).map((stake) => {
    const { lockedAmount } = stake
    return {
      ...staker,
      amount: lockedAmount,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  })
}
