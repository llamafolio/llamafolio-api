import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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
  const updatedBalances: DefaultSingleUnderlyingsBalances[] = []

  const [tokenBalances, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: singleUnderlyingsBalances.map(
        (balance) => ({ target: balance.underlyings?.[0].address, params: [balance.address] }) as const,
      ),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: singleUnderlyingsBalances.map((balance) => ({ target: balance.address }) as const),
      abi: abi.totalSupply,
    }),
  ])

  for (const [index, singleUnderlyingsBalance] of singleUnderlyingsBalances.entries()) {
    const underlying = singleUnderlyingsBalance.underlyings?.[0] as Contract
    const tokenBalance = tokenBalances[index]
    const totalSupplyRes = totalSuppliesRes[index]

    if (!underlying || !tokenBalance.success || !totalSupplyRes.success || totalSupplyRes.output === 0n) continue

    const pricedPerFullShare = singleUnderlyingsBalance.pricePerFullShare
      ? singleUnderlyingsBalance.amount * singleUnderlyingsBalance.pricePerFullShare
      : (singleUnderlyingsBalance.amount * tokenBalance.output) / totalSupplyRes.output

    updatedBalances.push({
      ...singleUnderlyingsBalance,
      underlyings: [{ ...underlying, amount: pricedPerFullShare }],
      category: params.getCategory(singleUnderlyingsBalance),
    })
  }

  return [...filteredBalances, ...updatedBalances]
}
