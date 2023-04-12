import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

export async function getADXStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesOfsRes, assetsBalanceOfsRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({
        target: (staker.underlyings?.[0] as Contract).address,
        params: [staker.address],
      })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const underlying = staker.underlyings?.[0] as Contract
    const userBalanceOfRes = userBalancesOfsRes[stakerIdx]
    const assetBalanceOfRes = assetsBalanceOfsRes[stakerIdx]
    const totalSupplyRes = totalSuppliesRes[stakerIdx]

    if (
      !isSuccess(userBalanceOfRes) ||
      !isSuccess(assetBalanceOfRes) ||
      !isSuccess(totalSupplyRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    balances.push({
      ...staker,
      amount: BigNumber.from(userBalanceOfRes.output).mul(assetBalanceOfRes.output).div(totalSupplyRes.output),
      underlyings: [underlying],
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
