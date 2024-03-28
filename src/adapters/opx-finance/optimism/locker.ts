import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  depositedNFT: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'depositedNFT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  locked: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'locked',
    outputs: [
      { internalType: 'int128', name: 'amount', type: 'int128' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getOPXLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const userId = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.depositedNFT })
  const lockData = await call({ ctx, target: locker.address, params: [userId], abi: abi.locked })

  const [amount, end] = lockData
  const now = Date.now() / 1000
  const unlockAt = Number(end)

  return {
    ...locker,
    amount,
    underlyings: undefined,
    claimable: now > unlockAt ? amount : 0n,
    unlockAt,
    rewards: undefined,
    category: 'lock',
  }
}
