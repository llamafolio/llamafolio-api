import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

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
}

export async function getLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const multipleUnderlyings: Balance[] = []

  const calls = lockers.map((locker) => ({ target: locker.address, params: [ctx.address] }))
  const lockerBalancesInfosRes = await multicall({ ctx, calls, abi: abi.getDepositsOf })

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const underlyings = locker.underlyings as Contract[]
    const lockerBalancesInfo = lockerBalancesInfosRes[lockerIdx]

    if (!isSuccess(lockerBalancesInfo)) {
      continue
    }

    lockerBalancesInfo.output.forEach((lockerBalanceInfo: any) => {
      const balance: Balance = {
        ...locker,
        address: locker.lpToken ? locker.lpToken : locker.address,
        amount: BigNumber.from(lockerBalanceInfo.amount),
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
