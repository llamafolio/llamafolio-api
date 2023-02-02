import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

export interface getTransmutationContractsParams extends Contract {
  lender: Token
  borrower: Token
}

export async function getTransmutationBalances(
  ctx: BalancesContext,
  transmuters: getTransmutationContractsParams[],
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = transmuters.map((transmuter) => ({ target: transmuter.address, params: [ctx.address] }))

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCdpTotalDeposited }),
    multicall({ ctx, calls, abi: abi.getCdpTotalDebt }),
  ])

  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    const lendBalanceRes = lendBalancesRes[idx]
    const borrowBalanceRes = borrowBalancesRes[idx]

    if (!isSuccess(lendBalanceRes) || !isSuccess(borrowBalanceRes)) {
      continue
    }

    const lend: Balance = {
      ...transmuter.lender,
      amount: BigNumber.from(lendBalanceRes.output),
      category: 'lend',
    }

    const borrow: Balance = {
      ...transmuter.borrower,
      amount: BigNumber.from(borrowBalanceRes.output),
      category: 'borrow',
    }
    balances.push(lend, borrow)
  }

  return balances
}
