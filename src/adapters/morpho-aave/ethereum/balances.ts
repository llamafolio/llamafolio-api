import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { MAX_UINT_256 } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  getAllMarkets: {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'address[]', name: 'marketsCreated', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentSupplyBalanceInOf: {
    inputs: [
      { internalType: 'address', name: '_poolToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getCurrentSupplyBalanceInOf',
    outputs: [
      { internalType: 'uint256', name: 'balanceInP2P', type: 'uint256' },
      { internalType: 'uint256', name: 'balanceOnPool', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentBorrowBalanceInOf: {
    inputs: [
      { internalType: 'address', name: '_poolToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getCurrentBorrowBalanceInOf',
    outputs: [
      { internalType: 'uint256', name: 'balanceInP2P', type: 'uint256' },
      { internalType: 'uint256', name: 'balanceOnPool', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserHealthFactor: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserHealthFactor',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  markets: Contract[],
  lens: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.getCurrentSupplyBalanceInOf>[] = markets.map((market) => ({
    target: lens.address,
    params: [market.address, ctx.address],
  }))

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCurrentSupplyBalanceInOf }),
    multicall({ ctx, calls, abi: abi.getCurrentBorrowBalanceInOf }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const lendBalanceRes = lendBalancesRes[marketIdx]
    const borrowBalanceRes = borrowBalancesRes[marketIdx]
    const underlyings = market.underlyings?.[0] as Contract

    if (lendBalanceRes.success) {
      const [_balanceInP2P, _balanceOnPool, totalBalance] = lendBalanceRes.output
      balances.push({
        ...market,
        decimals: underlyings.decimals,
        amount: totalBalance,
        underlyings: [underlyings],
        rewards: undefined,
        category: 'lend',
      })
    }

    if (borrowBalanceRes.success) {
      const [_balanceInP2P, _balanceOnPool, totalBalance] = borrowBalanceRes.output
      balances.push({
        ...market,
        chain: ctx.chain,
        address: market.address,
        decimals: underlyings.decimals,
        symbol: market.symbol,
        amount: totalBalance,
        underlyings: [underlyings],
        rewards: undefined,
        category: 'borrow',
      })
    }
  }

  return balances
}

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

export async function getUserHealthFactor(ctx: BalancesContext, morphoLens: Contract): Promise<number | undefined> {
  const userHealthFactorRes = await call({
    ctx,
    target: morphoLens.address,
    params: [ctx.address],
    abi: abi.getUserHealthFactor,
  })

  if (userHealthFactorRes === MAX_UINT_256) {
    return
  }

  return Number(userHealthFactorRes) / 1e18
}

export async function getUserHealthFactorV3(ctx: BalancesContext, comptroller: Contract): Promise<number | undefined> {
  const healthFactor = await call({ ctx, target: comptroller.address, params: [ctx.address], abi: abi.liquidityData })

  if (healthFactor.debt === 0n) {
    return undefined
  }

  return Number(healthFactor.maxDebt) / Number(healthFactor.debt)
}
