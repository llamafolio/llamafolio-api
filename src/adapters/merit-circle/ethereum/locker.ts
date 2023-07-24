import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  getDepositsOf: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'getDepositsOf',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint64', name: 'start', type: 'uint64' },
          { internalType: 'uint64', name: 'end', type: 'uint64' },
        ],
        internalType: 'struct TimeLockPool.Deposit[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const multipleUnderlyings: Balance[] = []

  const lockerBalancesInfosRes = await multicall({
    ctx,
    calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] }) as const),
    abi: abi.getDepositsOf,
  })

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const underlyings = locker.underlyings as Contract[]
    const lockerBalancesInfo = lockerBalancesInfosRes[lockerIdx]

    if (!lockerBalancesInfo.success) {
      continue
    }

    lockerBalancesInfo.output.forEach((lockerBalanceInfo: any) => {
      const balance: Balance = {
        ...locker,
        address: locker.lpToken ? locker.lpToken : locker.address,
        amount: lockerBalanceInfo.amount,
        unlockAt: lockerBalanceInfo.end,
        underlyings,
        rewards: undefined,
        category: 'lock',
      }

      if (underlyings.length > 1) {
        multipleUnderlyings.push(balance)
      } else {
        balances.push(balance)
      }
    })
  }

  const updateMultipleUnderlyings = await getUnderlyingBalances(ctx, multipleUnderlyings)
  return [...balances, ...updateMultipleUnderlyings]
}
