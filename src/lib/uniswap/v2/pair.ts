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
 * If `amount`, `underlyings[0]` (token0) and `underlyings[1]` (token1) are not defined, return input balance.
 */
export async function getPairsBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, contracts)

  return getUnderlyingBalances(ctx, balances)
}

/**
 * Retrieves underlying balances of Uniswap V2 like Pair contract balance.
 * If `amount`, `underlyings[0]` (token0) and `underlyings[1]` (token1) are not defined, return input balance.
 */
export async function getUnderlyingBalances<T extends Balance>(
  ctx: BalancesContext,
  balances: T[],
  params = { getAddress: (balance: T) => balance.address },
): Promise<T[]> {
  function isEnabled(balance: Balance) {
    return (
      balance.amount != null && balance.amount > 0n && balance.underlyings != null && balance.underlyings.length >= 2
    )
  }

  const [token0sBalanceOfRes, token1sBalanceOfRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: balances.map(
        (balance) =>
          ({
            target: balance.underlyings?.[0]?.address,
            params: [params.getAddress(balance)],
            enabled: isEnabled(balance),
          }) as const,
      ),
      abi: abi.balanceOf,
    }),

    multicall({
      ctx,
      calls: balances.map(
        (balance) =>
          ({
            target: balance.underlyings?.[1]?.address,
            params: [params.getAddress(balance)],
            enabled: isEnabled(balance),
          }) as const,
      ),
      abi: abi.balanceOf,
    }),

    multicall({
      ctx,
      calls: balances.map((balance) => ({
        target: params.getAddress(balance),
        enabled: isEnabled(balance),
      })),
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
