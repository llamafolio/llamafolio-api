import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  balanceWithRewardsOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceWithRewardsOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.balanceWithRewardsOf })

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: userBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
