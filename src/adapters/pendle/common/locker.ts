import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  positionData: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'positionData',
    outputs: [
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'uint128', name: 'expiry', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPendleLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const [amount, end] = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.positionData })

  const now = Date.now() / 1000
  const unlockAt = Number(end)

  return {
    ...locker,
    amount,
    unlockAt,
    claimable: now > unlockAt ? amount : 0n,
    underlyings: undefined,
    rewards: undefined,
    category: 'lock',
  }
}
