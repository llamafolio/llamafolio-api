import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export const abi = {
  balanceOf: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

/**
 * Retrieves pairs balances (with underlyings) of Uniswap V2 like Pair.
 * `amount`, `underlyings[0]` (token0) and `underlyings[1]` (token1) must be defined.
 */
export async function getPairsBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, contracts)

  return getUnderlyingBalances(ctx, balances)
}

/**
 * Retrieves underlying balances of Uniswap V2 like Pair contract balance.
 * `amount`, `underlyings[0]` (token0) and `underlyings[1]` (token1) must be defined.
 */
export async function getUnderlyingBalances(ctx: BalancesContext, balances: Balance[]) {
  // filter empty balances
  balances = balances.filter(
    (balance) => balance.amount && balance.amount > 0n && balance.underlyings?.[0] && balance.underlyings?.[1],
  )

  const [token0sBalanceOfRes, token1sBalanceOfRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: balances.map((bToken) => ({ target: bToken.underlyings![0].address, params: [bToken.address] } as const)),
      abi: abi.balanceOf,
    }),

    multicall({
      ctx,
      calls: balances.map((bToken) => ({ target: bToken.underlyings![1].address, params: [bToken.address] } as const)),
      abi: abi.balanceOf,
    }),

    multicall({
      ctx,
      calls: balances.map((token) => ({ target: token.address })),
      abi: abi.totalSupply,
    }),
  ])

  for (let i = 0; i < balances.length; i++) {
    const token0BalanceRes = token0sBalanceOfRes[i]
    const token1BalanceRes = token1sBalanceOfRes[i]
    const totalSupplyRes = totalSuppliesRes[i]

    if (
      !token0BalanceRes.success ||
      !token1BalanceRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const totalSupply = totalSupplyRes.output

    const balance0 = (token0BalanceRes.output * balances[i].amount) / totalSupply

    const balance1 = (token1BalanceRes.output * balances[i].amount) / totalSupply

    balances[i].underlyings = [
      {
        chain: ctx.chain,
        address: balances[i].underlyings![0].address,
        symbol: balances[i].underlyings![0].symbol,
        decimals: balances[i].underlyings![0].decimals,
        amount: balance0,
      },
      {
        chain: ctx.chain,
        address: balances[i].underlyings![1].address,
        symbol: balances[i].underlyings![1].symbol,
        decimals: balances[i].underlyings![1].decimals,
        amount: balance1,
      },
    ]
  }

  return balances
}
