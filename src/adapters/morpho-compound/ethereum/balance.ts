import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  getCurrentSupplyBalanceInOf: {
    inputs: [
      { internalType: 'address', name: '_poolToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getCurrentSupplyBalanceInOf',
    outputs: [
      { internalType: 'uint256', name: 'balanceOnPool', type: 'uint256' },
      { internalType: 'uint256', name: 'balanceInP2P', type: 'uint256' },
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
      { internalType: 'uint256', name: 'balanceOnPool', type: 'uint256' },
      { internalType: 'uint256', name: 'balanceInP2P', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMorphoMarketsBalances(
  ctx: BalancesContext,
  comptroller: Contract,
  morphoLens: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const markets: Contract[] = comptroller.markets as Contract[]

  const calls: Call<typeof abi.getCurrentSupplyBalanceInOf>[] = markets.map((market) => ({
    target: morphoLens.address,
    params: [market.address, ctx.address],
  }))

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCurrentSupplyBalanceInOf }),
    multicall({ ctx, calls, abi: abi.getCurrentBorrowBalanceInOf }),
  ])

  markets.forEach((market, idx) => {
    const underlying = market.underlyings?.[0] as Contract
    const lendBalanceRes = lendBalancesRes[idx]
    const borrowBalanceRes = borrowBalancesRes[idx]

    if (lendBalanceRes.success) {
      const [_balanceOnPool, _balanceInP2P, totalBalance] = lendBalanceRes.output
      balances.push({
        ...market,
        symbol: `c${underlying.symbol}`,
        decimals: underlying.decimals,
        amount: totalBalance,
        underlyings: [underlying],
        rewards: undefined,
        category: 'lend',
      })
    }

    if (borrowBalanceRes.success) {
      const [_balanceOnPool, _balanceInP2P, totalBalance] = borrowBalanceRes.output
      balances.push({
        ...market,
        symbol: `c${underlying.symbol}`,
        decimals: underlying.decimals,
        amount: totalBalance,
        underlyings: [underlying],
        rewards: undefined,
        category: 'borrow',
      })
    }
  })

  return balances
}
