import environment from '@environment'
import type { Balance } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { fromDefiLlamaChain } from '@lib/chains'

import type { YieldPool, YieldPoolResponse } from './types'

/**
 * Aggregate yield data for balances group
 * @param balancesGroups
 */
export async function aggregateYields(balancesGroups: any[]) {
  try {
    const yieldPoolsByChainProtocol = await parseYieldsPools()

    for (const balancesGroup of balancesGroups) {
      const yieldPools = yieldPoolsByChainProtocol[balancesGroup.chain as Chain]?.[balancesGroup.protocol] ?? []
      balancesGroup.balances = balancesGroup.balances.map((balance: Balance) =>
        aggregateBalanceYield({ balance, yieldPools }),
      )
    }

    return balancesGroups
  } catch (error) {
    console.error('Failed to aggregate yields', error)
    // Don't fail early if yields cannot be fetched
    return balancesGroups
  }
}

/**
 * Aggregate yield data for a given balance
 */
export function aggregateBalanceYield({ balance, yieldPools }: { balance: Balance; yieldPools: YieldPool[] }) {
  if (yieldPools.length === 0) {
    return balance
  }
  const yieldPoolsByKey: { [key: string]: YieldPool } = {}

  for (const yieldPool of yieldPools) {
    yieldPoolsByKey[`pool_old#${yieldPool.pool_old.toLowerCase()}`] = yieldPool

    if (yieldPool.underlyingTokens && yieldPool.underlyingTokens.length > 0) {
      const underlyingTokensKey = yieldPool.underlyingTokens
        .map((address) => address.toLowerCase())
        .sort()
        .join('_')
      yieldPoolsByKey[`underlyings#${underlyingTokensKey}`] = yieldPool
    }
  }

  const address = balance.address.toLowerCase()
  const underlyingTokensKey = balance.underlyings
    ?.map((token) => token.address.toLowerCase())
    .sort()
    .join('_')

  const yieldPool =
    // MATCH: by pool_old
    yieldPoolsByKey[`pool_old#${address}`] ||
    // MATCH: by tokens if only one token in yieldPool
    yieldPoolsByKey[`underlyings#${address}`] ||
    // MATCH: by underlying tokens
    (balance.underlyings && balance.underlyings.length > 0 && yieldPoolsByKey[`underlyings#${underlyingTokensKey}`])

  if (yieldPool) {
    return {
      ...balance,
      apy: yieldPool.apy,
      apyBase: yieldPool.apyBase,
      apyReward: yieldPool.apyReward,
      apyMean30d: yieldPool.apyMean30d,
      ilRisk: yieldPool.ilRisk,
    }
  }

  return balance
}

export async function parseYieldsPools() {
  const url = environment.CLOUDFLARE_R2_PUBLIC_URL
    ? `${environment.CLOUDFLARE_R2_PUBLIC_URL}/yield/llama_yields_pools_old.json`
    : 'https://yields.llama.fi/poolsOld'
  const response = await fetch(url)
  const json: YieldPoolResponse = await response.json()

  const yieldPoolsByChainProtocol: Partial<Record<Chain, Record<string, YieldPool[]>>> = {}

  for (const pool of json.data) {
    const chain = fromDefiLlamaChain[pool.chain]
    if (!chain || !pool.project) {
      continue
    }

    if (!yieldPoolsByChainProtocol[chain]) {
      yieldPoolsByChainProtocol[chain] = {}
    }
    if (!yieldPoolsByChainProtocol[chain]![pool.project]) {
      yieldPoolsByChainProtocol[chain]![pool.project] = []
    }

    yieldPoolsByChainProtocol[chain]![pool.project]!.push(pool)
  }

  return yieldPoolsByChainProtocol
}
