import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getCdpTotalDebt: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'getCdpTotalDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCdpTotalDeposited: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'getCdpTotalDeposited',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface getTransmutationContractsParams extends Contract {
  lender: Token
  borrower: Token
}

export async function getTransmutationBalances(
  ctx: BalancesContext,
  transmuters: getTransmutationContractsParams[],
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.getCdpTotalDeposited>[] = transmuters.map((transmuter) => ({
    target: transmuter.address,
    params: [ctx.address],
  }))

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCdpTotalDeposited }),
    multicall({ ctx, calls, abi: abi.getCdpTotalDebt }),
  ])

  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    const lendBalanceRes = lendBalancesRes[idx]
    const borrowBalanceRes = borrowBalancesRes[idx]

    if (!lendBalanceRes.success || !borrowBalanceRes.success) {
      continue
    }

    const lend: Balance = {
      ...transmuter.lender,
      amount: lendBalanceRes.output,
      category: 'lend',
    }

    const borrow: Balance = {
      ...transmuter.borrower,
      amount: borrowBalanceRes.output,
      category: 'borrow',
    }
    balances.push(lend, borrow)
  }

  return balances
}
