import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  exchangeRate: {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint192', name: '', type: 'uint192' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const RSR: Token = {
  chain: 'ethereum',
  address: '0x320623b8E4fF03373931769A31Fc52A4E78B5d70',
  decimals: 18,
  symbol: 'RSR',
}

export async function getReserveFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: abi.exchangeRate,
    }),
  ])

  for (const [index, farmer] of farmers.entries()) {
    const userBalanceRes = userBalancesRes[index]
    const exchangeRateRes = exchangeRatesRes[index]

    if (!userBalanceRes.success || !exchangeRateRes.success) {
      continue
    }

    balances.push({
      ...farmer,
      amount: userBalanceRes.output,
      underlyings: [{ ...RSR, amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0') }],
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
