import { Balance, BalancesContext, Contract, FarmBalance } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import { groupBy } from 'lodash'

import { convexProvider, curveProvider, llamaProvider } from './provider'

export interface LlamaBalancesParams extends FarmBalance {
  provider: string
  lpToken?: string
  pool?: string
}

export async function getLlamaBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
    abi: erc20Abi.balanceOf,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const balanceOfRes = balanceOfsRes[poolIdx]

    if (!isSuccess(balanceOfRes)) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    })
  }

  return getUnderlyingsLlamaBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: LlamaBalancesParams[]) => Promise<Balance[]>

const providers: Record<string, Provider | undefined> = {
  convex: convexProvider,
  curve: curveProvider,
  llama: llamaProvider,
}

const getUnderlyingsLlamaBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as LlamaBalancesParams[])
      }),
    )
  ).flat()
}
