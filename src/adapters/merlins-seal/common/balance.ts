import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stakingBalance0f: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakingBalance0f',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lockedBalanceOf: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'lockedBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMerlinReStaker(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const stakingBalance0f = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakingBalance0f })

  return {
    ...staker,
    amount: stakingBalance0f,
    underlyings: [{ ...(staker.underlyings![0] as Contract) }],
    rewards: undefined,
    category: 'stake',
  }
}

export async function getMerlinStaker(ctx: BalancesContext, staker: Contract): Promise<Balance | []> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) return []

  const stakingBalance0fs = await multicall({
    ctx,
    calls: underlyings.map(
      (underlying) => ({ target: staker.address, params: [ctx.address, underlying.address] }) as const,
    ),
    abi: abi.lockedBalanceOf,
  })

  return mapSuccessFilter(stakingBalance0fs, (res, index) => ({
    ...(staker.underlyings![index] as Contract),
    address: staker.address,
    token: (staker.underlyings![index] as Contract).address,
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
