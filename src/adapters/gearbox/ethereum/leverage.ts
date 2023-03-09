import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

export async function getLeverageFarming(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const creditManagersRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.pool, params: [1] })),
    abi: abi.creditManagers,
  })

  const [creditAccountsRes, creditFacadesRes] = await Promise.all([
    multicall({
      ctx,
      calls: creditManagersRes.map((manager) =>
        isSuccess(manager) ? { target: manager.output, params: [ctx.address] } : null,
      ),
      abi: abi.creditAccounts,
    }),
    multicall({
      ctx,
      calls: creditManagersRes.map((manager) => (isSuccess(manager) ? { target: manager.output } : null)),
      abi: abi.creditFacade,
    }),
  ])

  const creditAccounts = creditAccountsRes.filter(isSuccess).map((res) => res.output)

  const [creditAccountAccruedInterestsRes, creditFacadeTotalValuesRes] = await Promise.all([
    multicall({
      ctx,
      calls: creditAccountsRes.map((creditAccount) =>
        isSuccess(creditAccount) ? { target: creditAccount.input.target, params: [creditAccount.output] } : null,
      ),
      abi: abi.calcCreditAccountAccruedInterest,
    }),
    multicall({
      ctx,
      calls: creditFacadesRes.map((creditFacade, idx) =>
        isSuccess(creditFacade) ? { target: creditFacade.output, params: [creditAccounts[idx]] } : null,
      ),
      abi: abi.calcTotalValue,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const creditAccountAccruedInterestRes = creditAccountAccruedInterestsRes[poolIdx]
    const creditFacadeTotalValueRes = creditFacadeTotalValuesRes[poolIdx]

    if (!isSuccess(creditAccountAccruedInterestRes) || !isSuccess(creditFacadeTotalValueRes)) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(creditAccountAccruedInterestRes.output.borrowedAmountWithInterest),
      underlyings,
      rewards: undefined,
      category: 'borrow',
    })

    balances.push({
      ...pool,
      amount: BigNumber.from(creditFacadeTotalValueRes.output.total),
      underlyings,
      rewards: undefined,
      category: 'lend',
    })
  }

  return balances
}
