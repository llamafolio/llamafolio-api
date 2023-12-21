import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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

export async function getBeefyFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
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
    const decimals = BigInt(pool.decimals!)
    const userBalanceRes = userBalancesRes[index]
    const exchangeRateRes = exchangeRatesRes[index]

    if (!userBalanceRes.success || !exchangeRateRes.success || userBalanceRes.output === 0n) {
      continue
    }

    balances.push({
      ...pool,
      amount: (userBalanceRes.output * exchangeRateRes.output) / 10n ** decimals,
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      beefyKey: pool.beefyKey,
      category: 'farm',
    })
  }

  return getBeefyUnderlyingsBalances(ctx, balances)
}

export async function getBeefyUnderlyingsBalances(ctx: BalancesContext, pools: BeefyBalances[]): Promise<Balance[]> {
  const API_URL = `https://api.beefy.finance/lps/breakdown`
  const vaults: any = await fetch(API_URL).then((response) => response.json())

  for (const pool of pools) {
    const { underlyings } = pool
    if (!underlyings || !vaults[pool.beefyKey]) continue

    const { tokens, balances: rawBalances, totalSupply: rawTotalSupply } = vaults[pool.beefyKey]

    if (!rawBalances) continue

    const balances = rawBalances.map((balance: number) => BigInt(balance * Math.pow(10, 18)))
    const totalSupply = BigInt(rawTotalSupply * Math.pow(10, 18))

    const remainingUnderlyings = [...underlyings]
    const matchingUnderlyings: any[] = []
    const unmatchedTokens: any[] = []

    for (const [index, token] of tokens.entries()) {
      const matchingUnderlyingIndex: number = remainingUnderlyings.findIndex(
        (underlying: any) => underlying.address.toLowerCase() === token.toLowerCase(),
      )

      if (matchingUnderlyingIndex !== -1) {
        const matchingUnderlying: any = remainingUnderlyings[matchingUnderlyingIndex]
        const amount = (pool.amount * balances[index]) / totalSupply
        matchingUnderlying.decimals = 18
        matchingUnderlying.amount = amount

        matchingUnderlyings.push(matchingUnderlying)
        remainingUnderlyings.splice(matchingUnderlyingIndex, 1)
      } else {
        unmatchedTokens.push({
          chain: ctx.chain,
          address: token,
          amount: (pool.amount * balances[index]) / totalSupply,
        })
      }
    }

    const unmatchedUnderlyings = [...remainingUnderlyings]
    const fmtUnmatchedUnderlyings = await getUnmatchUnderlyings(unmatchedTokens, unmatchedUnderlyings, vaults)

    pool.underlyings = [...matchingUnderlyings, ...(fmtUnmatchedUnderlyings || [])]
  }

  return pools
}

async function getUnmatchUnderlyings(
  unmatchedTokens: Contract[],
  unmatchedUnderlyings: Contract[],
  vaults: any,
): Promise<any[]> {
  const API_URL = `https://api.beefy.finance/tokens`
  const response = await fetch(API_URL)
  const tokens: { [key: string]: any } = await response.json()

  for (let i = unmatchedTokens.length - 1; i >= 0; i--) {
    const unmatchedToken = unmatchedTokens[i]
    const tokensByChain = tokens[unmatchedToken.chain] || {}

    Object.values(tokensByChain).some((vault: any) => {
      const isAddressMatch =
        unmatchedToken.address &&
        vault.address &&
        unmatchedToken.address.toLocaleLowerCase() === vault.address.toLowerCase()

      if (isAddressMatch && vaults[vault.oracleId]) {
        const { tokens, balances: rawBalances, totalSupply: rawTotalSupply } = vaults[vault.oracleId]
        const totalSupply = BigInt(rawTotalSupply * Math.pow(10, 18))

        const tokenBalances = tokens.map((token: string, index: number) => {
          const balance = (BigInt(rawBalances[index] * Math.pow(10, 18)) * unmatchedToken.amount) / totalSupply
          return { address: token, amount: balance, chain: unmatchedToken.chain }
        })

        unmatchedTokens.splice(i, 1, ...tokenBalances)
        return true
      }
      return false
    })
  }

  if (unmatchedTokens.length !== unmatchedUnderlyings.length) return []

  return unmatchedTokens.map((token, index) => {
    const underlying = unmatchedUnderlyings[index]
    return {
      ...underlying,
      decimals: 18,
      amount: token.amount,
    }
  })
}
