import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  creditManagers: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'creditManagers',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  calcCreditAccountAccruedInterest: {
    inputs: [{ internalType: 'address', name: 'creditAccount', type: 'address' }],
    name: 'calcCreditAccountAccruedInterest',
    outputs: [
      { internalType: 'uint256', name: 'borrowedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowedAmountWithInterest', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowedAmountWithInterestAndFees', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  creditAccounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'creditAccounts',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  creditFacade: {
    inputs: [],
    name: 'creditFacade',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  calcTotalValue: {
    inputs: [{ internalType: 'address', name: 'creditAccount', type: 'address' }],
    name: 'calcTotalValue',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'twv', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLeverageFarming(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const creditManagersRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.pool, params: [1n] } as const)),
    abi: abi.creditManagers,
  })

  const [creditAccountsRes, creditFacadesRes] = await Promise.all([
    multicall({
      ctx,
      calls: creditManagersRes.map((manager) =>
        manager.success ? ({ target: manager.output, params: [ctx.address] } as const) : null,
      ),
      abi: abi.creditAccounts,
    }),
    multicall({
      ctx,
      calls: creditManagersRes.map((manager) => (manager.success ? ({ target: manager.output } as const) : null)),
      abi: abi.creditFacade,
    }),
  ])

  const [creditAccountAccruedInterestsRes, creditFacadeTotalValuesRes] = await Promise.all([
    multicall({
      ctx,
      calls: creditAccountsRes.map((creditAccount) =>
        creditAccount.success
          ? ({ target: creditAccount.input.target, params: [creditAccount.output] } as const)
          : null,
      ),
      abi: abi.calcCreditAccountAccruedInterest,
    }),
    multicall({
      ctx,
      calls: creditFacadesRes.map((creditFacade, idx) => {
        const creditAccount = creditAccountsRes[idx]

        return creditFacade.success && creditAccount.success
          ? ({ target: creditFacade.output, params: [creditAccount.output] } as const)
          : null
      }),
      abi: abi.calcTotalValue,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const creditAccountAccruedInterestRes = creditAccountAccruedInterestsRes[poolIdx]
    const creditFacadeTotalValueRes = creditFacadeTotalValuesRes[poolIdx]

    if (!creditAccountAccruedInterestRes.success || !creditFacadeTotalValueRes.success) {
      continue
    }

    const [_borrowedAmount, borrowedAmountWithInterest, _borrowedAmountWithInterestAndFees] =
      creditAccountAccruedInterestRes.output
    const [total, _twv] = creditFacadeTotalValueRes.output

    balances.push({
      ...pool,
      amount: borrowedAmountWithInterest,
      underlyings,
      rewards: undefined,
      category: 'borrow',
    })

    balances.push({
      ...pool,
      amount: total,
      underlyings,
      rewards: undefined,
      category: 'lend',
    })
  }

  return balances
}
