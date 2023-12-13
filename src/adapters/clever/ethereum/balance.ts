import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { groupBy, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { multicall } from '@lib/multicall'

const abi = {
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint128', name: 'totalDebt', type: 'uint128' },
      { internalType: 'uint128', name: 'rewards', type: 'uint128' },
      { internalType: 'uint192', name: 'rewardPerSharePaid', type: 'uint192' },
      { internalType: 'uint64', name: 'lastInteractedBlock', type: 'uint64' },
      { internalType: 'uint112', name: 'totalLocked', type: 'uint112' },
      { internalType: 'uint112', name: 'totalUnlocked', type: 'uint112' },
      { internalType: 'uint32', name: 'nextUnlockIndex', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserInfo: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'getUserInfo',
    outputs: [
      { internalType: 'int256', name: '_totalDebt', type: 'int256' },
      { internalType: 'uint256', name: '_totalValue', type: 'uint256' },
      { internalType: 'uint256[]', name: '_indices', type: 'uint256[]' },
      { internalType: 'uint256[]', name: '_shares', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type CleBalance = Balance & {
  index: number
}

export async function getCleCVXLendBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[] | undefined> {
  const [lender, borrower] = contract.underlyings as Contract[]
  if (!lender || !borrower) return

  const [totalDebt, _, __, ___, totalLocked] = await call({
    ctx,
    target: contract.address,
    params: [ctx.address] as const,
    abi: abi.userInfo,
  })

  const lendBalance: LendBalance = {
    ...lender,
    amount: totalLocked,
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
  }
  const borrowBalance: BorrowBalance = {
    ...borrower,
    amount: totalDebt,
    underlyings: undefined,
    rewards: undefined,
    category: 'borrow',
  }

  return [lendBalance, borrowBalance]
}

export async function getCleLendBalances(ctx: BalancesContext, contracts: Contract[]) {
  const userInfos = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
    abi: abi.getUserInfo,
  })

  const balances = mapSuccessFilter(userInfos, (res, index) => {
    const contract = contracts[index]
    const borrower = contract.underlyings![0] as Contract
    const [debt, coll] = res.output

    const lendBalance: CleBalance = {
      ...contract,
      amount: coll,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
      index,
    }
    const borrowBalance: CleBalance = {
      ...borrower,
      amount: debt,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
      index,
    }

    return [lendBalance, borrowBalance]
  })

  const sortedBalances = groupBy(await getCurveUnderlyingsBalances(ctx, balances.flat()), 'index')
  return Object.values(sortedBalances).map((balances) => ({ balances })) as any
}
