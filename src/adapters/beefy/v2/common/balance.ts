import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type BeefyBalances = Balance & {
  beefyKey: string
}

export async function getBeefyBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: BeefyBalances[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] as const })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.getPricePerFullShare }),
  ])

  for (const [index, pool] of pools.entries()) {
    const userBalanceRes = userBalancesRes[index]
    const exchangeRateRes = exchangeRatesRes[index]

    if (!userBalanceRes.success || !exchangeRateRes.success || userBalanceRes.output === 0n) {
      continue
    }

    balances.push({
      ...pool,
      amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0'),
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      beefyKey: pool.beefyKey,
      category: 'farm',
    })
  }

  return getBeefyUnderlyingsBalances(ctx, balances)
}

async function getBeefyUnderlyingsBalances(ctx: BalancesContext, pools: BeefyBalances[]): Promise<Balance[]> {
  const API_URL = `https://api.beefy.finance/lps/breakdown`
  const vaults: any = await fetch(API_URL).then((response) => response.json())

  for (const pool of pools) {
    const { underlyings } = pool
    if (!underlyings) continue

    const { tokens, balances, totalSupply } = vaults[pool.beefyKey]

    tokens.forEach((token: any, index: number) => {
      const matchingUnderlying: any = underlyings.find(
        (underlying: any) => underlying.address.toLowerCase() === token.toLowerCase(),
      )

      if (matchingUnderlying) {
        const amount = (Number(pool.amount) * balances[index]) / totalSupply
        matchingUnderlying.amount = BigInt(amount)
      }
    })
  }

  return pools
}
