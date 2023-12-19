import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getAllUserDepositIds: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getAllUserDepositIds',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  depositInfo: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'depositInfo',
    outputs: [
      { internalType: 'uint256', name: 'depositAmount', type: 'uint256' },
      { internalType: 'uint96', name: 'lockedUntil', type: 'uint96' },
      { internalType: 'enum TreasureDAO.Lock', name: 'lock', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTreasureLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const userIds = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getAllUserDepositIds })
  const userDeposits = await multicall({
    ctx,
    calls: userIds.map((id) => ({ target: locker.address, params: [ctx.address, id] }) as const),
    abi: abi.depositInfo,
  })

  return mapSuccessFilter(userDeposits, (res) => {
    const now = Date.now() / 1000
    const [amount, end] = res.output
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
  })
}
