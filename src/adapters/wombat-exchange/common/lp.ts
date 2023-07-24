import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  exchangeRate: {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: 'xr', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  balanceOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getWombatLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: pool.provider, params: [(pool.underlyings![0] as Contract).address] }) as const,
      ),
      abi: abi.exchangeRate,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlying = pool.underlyings?.[0] as Contract
    const userBalanceRes = userBalancesRes[poolIdx]
    const exchangeRateRes = exchangeRatesRes[poolIdx]

    if (!underlying || !userBalanceRes.success || !exchangeRateRes.success) {
      continue
    }

    const fmtUnderlying = {
      ...underlying,
      decimals: 18,
      amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0'),
    }

    balances.push({
      ...pool,
      amount: userBalanceRes.output,
      underlyings: [fmtUnderlying],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
