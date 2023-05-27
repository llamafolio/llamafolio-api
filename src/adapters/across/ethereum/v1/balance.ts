import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

export async function getAcrossLPBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesOfsRes, totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: (pool.underlyings![0] as Contract).address, params: [pool.address] } as const),
      ),
      abi: erc20Abi.balanceOf,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlying = pool.underlyings?.[0] as Contract
    const userBalanceOfRes = userBalancesOfsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (
      !underlying ||
      !userBalanceOfRes.success ||
      !totalSupplyRes.success ||
      !underlyingsBalanceRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const fmtUnderlyings = {
      ...underlying,
      amount: BigNumber.from(userBalanceOfRes.output).mul(underlyingsBalanceRes.output).div(totalSupplyRes.output),
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(userBalanceOfRes.output),
      underlyings: [fmtUnderlyings],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
