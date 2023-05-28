import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getSingleLockerBalances } from '@lib/lock'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFraxLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [lockedBalances, incentivesEarnedRes] = await Promise.all([
    getSingleLockerBalances(ctx, lockers, 'locked'),
    multicall({
      ctx,
      calls: lockers.map((locker) => ({ target: locker.rewarder, params: [ctx.address] } as const)),
      abi: abi.earned,
    }),
  ])

  lockedBalances
    .map((lockedBalance, idx) => {
      const underlying = lockedBalance.underlyings?.[0] as Contract
      const reward = lockedBalance.underlyings?.[0] as Contract
      const incentiveEarnedRes = incentivesEarnedRes[idx]

      if (!incentiveEarnedRes.success) {
        return null
      }

      balances.push({
        ...lockedBalance,
        underlyings: [{ ...underlying, amount: lockedBalance.amount }],
        rewards: [{ ...reward, amount: incentiveEarnedRes.output }],
      })
    })
    .filter(isNotNullish)

  return balances
}
