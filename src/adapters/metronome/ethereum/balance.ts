import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMetronomeBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, pricePerSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => (market.token ? { target: market.token } : null)),
      abi: abi.pricePerShare,
    }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const { underlyings } = market
    const balanceOfRes = balanceOfsRes[marketIdx]
    const pricePerShareRes = pricePerSharesRes[marketIdx]
    const pricePerShare = pricePerShareRes.success ? pricePerShareRes.output : parseEther('1.0')

    if (!balanceOfRes.success || !pricePerShare) {
      continue
    }

    balances.push({
      ...(market as Balance),
      amount: (balanceOfRes.output * pricePerShare) / parseEther('1.0'),
      underlyings: underlyings as Contract[],
      rewards: undefined,
    })
  }

  return balances
}
