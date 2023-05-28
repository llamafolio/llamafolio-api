import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getADXStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesOfsRes, assetsBalanceOfsRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map(
        (staker) =>
          ({
            target: (staker.underlyings?.[0] as Contract).address,
            params: [staker.address],
          } as const),
      ),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address })),
      abi: erc20Abi.totalSupply,
    } as const),
  ])

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const underlying = staker.underlyings?.[0] as Contract
    const userBalanceOfRes = userBalancesOfsRes[stakerIdx]
    const assetBalanceOfRes = assetsBalanceOfsRes[stakerIdx]
    const totalSupplyRes = totalSuppliesRes[stakerIdx]

    if (
      !userBalanceOfRes.success ||
      !assetBalanceOfRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    balances.push({
      ...staker,
      amount: (userBalanceOfRes.output * assetBalanceOfRes.output) / totalSupplyRes.output,
      underlyings: [underlying],
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
