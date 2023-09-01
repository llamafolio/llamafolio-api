import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [
      { internalType: 'address[]', name: '_rewardTokens', type: 'address[]' },
      { internalType: 'uint256[]', name: '_claimableAmounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPricePerShare: {
    inputs: [],
    name: 'getPricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getVesperStakeBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.pricePerShare,
    }),
  ])

  for (const [index, pool] of pools.entries()) {
    const underlying = pool.underlyings?.[0] as Contract
    const userBalanceRes = userBalancesRes[index]
    const exchangeRateRes = exchangeRatesRes[index]

    if (!underlying || !userBalanceRes.success || !exchangeRateRes.success) {
      continue
    }

    const fmtUnderlyings = {
      ...underlying,
      amount: (userBalanceRes.output * exchangeRateRes.output) / BigInt(Math.pow(10, 18)),
    }

    balances.push({
      ...pool,
      amount: userBalanceRes.output,
      underlyings: [fmtUnderlyings],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

export async function getvVSPStakeBalance(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const balances: Balance[] = []

  const [userBalance, exchangeRate] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: pool.address, abi: abi.getPricePerShare }),
  ])

  const fmtUnderlyings = {
    ...(pool.underlyings?.[0] as Contract),
    amount: (userBalance * exchangeRate) / BigInt(Math.pow(10, 18)),
  }

  return {
    ...pool,
    amount: userBalance,
    underlyings: [fmtUnderlyings],
    rewards: undefined,
    category: 'stake',
  }
}
