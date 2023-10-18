import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

type DefaultSingleUnderlyingsBalances = Balance & {
  pricePerFullShare: bigint
}

export async function getDefaultSingleUnderlyingsBalances(
  ctx: BalancesContext,
  balances: DefaultSingleUnderlyingsBalances[],
  params = { getCategory: (balance: Balance) => balance.category },
): Promise<Balance[]> {
  const filteredBalances = balances.filter((balance) => !balance.underlyings || balance.underlyings.length !== 1)
  const singleUnderlyingsBalances = balances.filter((balance) => balance.underlyings?.length === 1)

  const [tokenBalances, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: singleUnderlyingsBalances.map(
        (balance) => ({ target: balance.underlyings![0].address, params: [balance.address] }) as const,
      ),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: singleUnderlyingsBalances.map((balance) => ({ target: balance.address }) as const),
      abi: abi.totalSupply,
    }),
  ])

  const formattedBalances = mapMultiSuccessFilter(
    singleUnderlyingsBalances.map((_, i) => [tokenBalances[i], totalSuppliesRes[i]]),

    (res, poolIdx) => {
      const singleBalance = singleUnderlyingsBalances[poolIdx]
      const underlying = singleBalance.underlyings?.[0] as Contract
      const [{ output: tokensBalancesOf }, { output: totalSupply }] = res.inputOutputPairs

      if (!underlying || totalSupply === 0n) return null

      const pricedPerFullShare = singleBalance.pricePerFullShare
        ? singleBalance.amount * singleBalance.pricePerFullShare
        : (singleBalance.amount * tokensBalancesOf) / totalSupply.output

      return {
        ...singleBalance,
        underlyings: [{ ...underlying, amount: pricedPerFullShare }],
        category: params.getCategory(singleBalance),
      }
    },
  ).filter(isNotNullish)

  return [...filteredBalances, ...formattedBalances]
}
