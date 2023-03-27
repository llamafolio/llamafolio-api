import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  locked: {
    stateMutability: 'view',
    type: 'function',
    name: 'locked',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'int128' },
      { name: 'end', type: 'uint256' },
    ],
    gas: 5653,
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getFraxLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = lockers.map((locker) => ({ target: locker.address, params: [ctx.address] }))

  const [lockedBalancesOf, incentivesEarnedRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.locked }),
    multicall({
      ctx,
      calls: lockers.map((locker) => ({ target: locker.rewarder, params: [ctx.address] })),
      abi: abi.earned,
    }),
  ])

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const reward = locker.underlyings?.[0] as Contract
    const lockedBalanceOf = lockedBalancesOf[lockerIdx]
    const incentiveEarnedRes = incentivesEarnedRes[lockerIdx]

    if (!isSuccess(lockedBalanceOf) || !isSuccess(incentiveEarnedRes)) {
      continue
    }

    balances.push({
      ...locker,
      underlyings: locker.underlyings as Contract[],
      amount: BigNumber.from(lockedBalanceOf.output.amount),
      unlockAt: lockedBalanceOf.output.end,
      rewards: [{ ...reward, amount: BigNumber.from(incentiveEarnedRes.output) }],
      category: 'lock',
    })
  }

  return balances
}
