import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  farmed: {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'rewardsToken',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'farmed',
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

export async function getInchRewardBalances(ctx: BalancesContext, rewarders: Contract[]): Promise<Balance[]> {
  const userRewardsBalances = await multicall({
    ctx,
    calls: rewarders.map((rewarder) => ({ target: rewarder.address, params: [rewarder.token!, ctx.address] } as const)),
    abi: abi.farmed,
  })

  return mapSuccessFilter(userRewardsBalances, (res, idx) => ({
    ...rewarders[idx],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }))
}
