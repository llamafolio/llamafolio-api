import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  collateralBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'collateralBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  borrowBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'borrowBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  liquidityData: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'liquidityData',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'borrowable', type: 'uint256' },
          { internalType: 'uint256', name: 'maxDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'debt', type: 'uint256' },
        ],
        internalType: 'struct Types.LiquidityData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendBorrowBalancesAaveV3(
  ctx: BalancesContext,
  markets: Contract[],
  comptroller: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: comptroller.address, params: [market.address, ctx.address] } as const)),
      abi: abi.collateralBalance,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: comptroller.address, params: [market.address, ctx.address] } as const)),
      abi: abi.borrowBalance,
    }),
  ])

  for (const [index, market] of markets.entries()) {
    const lendBalanceRes = lendBalancesRes[index]
    const borrowBalanceRes = borrowBalancesRes[index]

    if (!lendBalanceRes.success || !borrowBalanceRes.success) {
      continue
    }

    const lend: Balance = {
      ...market,
      amount: lendBalanceRes.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    }

    const borrow: Balance = {
      ...market,
      amount: borrowBalanceRes.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    balances.push(lend, borrow)
  }

  return balances
}

export async function getUserHealthFactorV3(ctx: BalancesContext, comptroller: Contract): Promise<number | undefined> {
  const healthFactor = await call({ ctx, target: comptroller.address, params: [ctx.address], abi: abi.liquidityData })

  if (healthFactor.debt === 0n) {
    return undefined
  }

  return Number(healthFactor.maxDebt) / Number(healthFactor.debt)
}
