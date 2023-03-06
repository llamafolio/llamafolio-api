import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'
import { groupBy } from 'lodash'

import { auraProvider, convexProvider, ProviderBalancesParams, sushiProvider } from './provider'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getBadgerBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const rateOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.getPricePerFullShare,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const rateOfRes = rateOfsRes[poolIdx]

    if (isZero(pool.amount) || !isSuccess(rateOfRes)) {
      continue
    }

    balances.push({
      ...pool,
      amount: pool.amount.mul(rateOfRes.output).div(utils.parseEther('1.0')),
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    })
  }

  return getUnderlyingsBadgerBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: ProviderBalancesParams[]) => Promise<ProviderBalancesParams[]>

const providers: Record<string, Provider | undefined> = {
  Aura: auraProvider,
  Convex: convexProvider,
  Curve: convexProvider,
  Sushiswap: sushiProvider,
}

const getUnderlyingsBadgerBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // add totalSupply, required to get formatted underlyings balances
  const totalSuppliesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: erc20Abi.totalSupply,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    if (isSuccess(totalSupplyRes)) {
      pools[poolIdx].totalSupply = BigNumber.from(totalSupplyRes.output)
    }
  }

  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as ProviderBalancesParams[])
      }),
    )
  ).flat()
}
