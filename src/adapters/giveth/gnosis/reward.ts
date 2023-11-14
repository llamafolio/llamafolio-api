import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  claimableNow: {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }],
    name: 'claimableNow',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGivethAirdrops(ctx: BalancesContext, rewarders: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: rewarders.map((rewarder) => ({ target: rewarder.address, params: [ctx.address] }) as const),
    abi: abi.claimableNow,
  })

  return mapSuccessFilter(userBalancesRes, (res, index) => ({
    ...rewarders[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }))
}
