import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi, getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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
  const validBalances: Balance[] = []
  const invalidBalances: Balance[] = []

  balances
    .filter((balance) => balance.amount && balance.amount > 0n)
    .forEach((balance) => {
      if (balance.underlyings?.[0] && balance.underlyings?.[1]) {
        validBalances.push(balance)
      } else {
        invalidBalances.push(balance)
      }
    })

  const [token0sBalanceOfRes, token1sBalanceOfRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: validBalances.map(
        (bToken) => ({ target: bToken.underlyings![0].address, params: [bToken.address] }) as const,
      ),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: validBalances.map(
        (bToken) => ({ target: bToken.underlyings![1].address, params: [bToken.address] }) as const,
      ),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: validBalances.map((token) => ({ target: token.address })),
      abi: abi.totalSupply,
    }),
  ])

  const updatedBalances = updateUnderlyingBalances(
    ctx,
    validBalances,
    token0sBalanceOfRes,
    token1sBalanceOfRes,
    totalSuppliesRes,
  )

  return [...invalidBalances, ...updatedBalances]
}

function updateUnderlyingBalances(
  ctx: BalancesContext,
  balances: Balance[],
  token0sBalanceOfRes: any[],
  token1sBalanceOfRes: any[],
  totalSuppliesRes: any[],
): Balance[] {
  return balances.map((balance, i) => {
    const token0BalanceRes = token0sBalanceOfRes[i]
    const token1BalanceRes = token1sBalanceOfRes[i]
    const totalSupplyRes = totalSuppliesRes[i]

    if (
      !token0BalanceRes.success ||
      !token1BalanceRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      return balance
    }

    const totalSupply = totalSupplyRes.output
    const balance0 = (token0BalanceRes.output * balance.amount) / totalSupply
    const balance1 = (token1BalanceRes.output * balance.amount) / totalSupply

    return {
      ...balance,
      underlyings: [
        createUnderlying(ctx, balance.underlyings![0], balance0),
        createUnderlying(ctx, balance.underlyings![1], balance1),
      ],
    }
  })
}

function createUnderlying(ctx: BalancesContext, underlying: Contract, amount: bigint): Contract {
  return {
    chain: ctx.chain,
    address: underlying.address,
    symbol: underlying.symbol,
    decimals: underlying.decimals,
    amount,
  }
}
