import environment from '@environment'
import type { Chain } from '@lib/chains'
import { chainsNames } from '@lib/chains'
import { raise } from '@lib/error'
import { retrieveToken } from '@lib/token'
import type { MapValueType } from '@lib/type'
import { isNotFalsy } from '@lib/type'
import type { Token } from '@llamafolio/tokens'

import type { YieldBalanceGroup, YieldPoolResponse } from './types'
/**
 * Parse Yield Pools:
 * 1. consume JSON.data from https://yields.llama.fi/poolsOld
 * 2. group items by `${chain}-${protocol}` (e.g., `ethereum-aave`)
 * 3. return a Map w/ key `${chain}-${protocol}` and value array of pools for given `${chain}-${protocol}`
 *
 * Parse Balances:
 * 1. consume JSON.groups from https://api.llamafolio.com/balances/${address}
 * 2. group items by `${chain}-${protocol}` (e.g., `ethereum-aave`)
 * 3. return a Map w/ key `${chain}-${protocol}` and value array of balances for given `${chain}-${protocol}`
 *
 * Match:
 * 1. iterate over balances
 * 2. for each balance, find a match in yields: `yieldPools.get(key)`
 * 3. if match found, add to matches array: `matches.push({ key, result: { yield, balance } })`
 * 4. return matches array
 *
 * Next: run it through `matcher` function
 *
 */

export async function defiLamaYieldMatcher({
  yieldPools,
  balances,
}: {
  yieldPools: YieldPoolsMap
  balances: BalanceMap
}) {
  /**
   * This stores matches between yield pools and balances
   * A match here means yield pool & balance are for the same chain and protocol
   */
  const chainProtocolMatches: Array<{
    key: string
    result: {
      yields: MapValueType<typeof yieldPools>
      balance: MapValueType<typeof balances>
    }
  }> = []

  for (const [key, value] of balances.entries()) {
    const match = yieldPools.get(key)
    if (match) chainProtocolMatches.push({ key, result: { yields: match, balance: value } })
  }

  const matches = [] as any[]
  for (const chainProtocolMatch of chainProtocolMatches) {
    const match = matcher({
      balances: chainProtocolMatch.result.balance.balances,
      yields: chainProtocolMatch.result.yields,
    })
    if (match && match.length > 0) matches.push(match)
  }

  return matches.flat()
}

/** takes project and protocol level matches and match each balance to a yield pool */
function matcher({
  balances,
  yields,
}: {
  balances: Omit<YieldBalanceGroup, 'chain' | 'protocol'>['balances']
  yields: ({
    pool: string
    tokens: Token[] | null
  } & Record<string, any>)[]
}) {
  if (balances.length === 0) return null

  const matches = [] as any[]
  for (const balance of balances) {
    const { underlyings, ...balanceRest } = balance

    for (const yieldPool of yields) {
      const { tokens: yieldTokens, pool_old, ...yieldPoolRest } = yieldPool

      // matched by pool_old
      if (balance.address.toLowerCase() === pool_old.toLowerCase()) {
        matches.push({ ...yieldPoolRest, ...balanceRest })
        continue
      }

      if (!underlyings || !yieldTokens || yieldTokens.length !== underlyings.length) continue

      // check that all underlyings are in yieldTokens
      const matchedByTokens = yieldTokens.filter((token) =>
        underlyings.some((underlying) => underlying.address.toLowerCase() === token.address.toLowerCase()),
      )

      if (matchedByTokens.length === underlyings.length) {
        matches.push({ ...yieldPoolRest, tokens: matchedByTokens, ...balanceRest })
      }
    }
  }

  return matches
}

export type YieldPoolsMap = Map<
  `${Chain}-${string}`,
  ({
    pool: string
    tokens: Token[] | null
  } & Record<string, any>)[]
>
export async function parseYieldsPools() {
  const url = environment.OUTSIDE_CONTRIBUTOR
    ? 'https://yields.llama.fi/poolsOld'
    : `${environment.CLOUDFLARE_R2_PUBLIC_URL}/yield/llama_yields_pools_old.json` ??
      raise('missing CLOUDFLARE_R2_PUBLIC_URL')
  const response = await fetch(url)
  const json: YieldPoolResponse = await response.json()

  const yieldPools: YieldPoolsMap = new Map()

  for (const pool of json.data) {
    const chain = pool.chain.toLowerCase() as Chain
    if (!chainsNames.includes(chain)) continue
    const key: `${Chain}-${string}` = [chain, pool.project].join('-') as `${Chain}-${string}`

    if (!yieldPools.has(key)) yieldPools.set(key, [])

    const { underlyingTokens, pool: poolId, ...poolData } = pool

    yieldPools.get(key)?.push({
      pool: poolId,
      tokens: underlyingTokens
        ? (underlyingTokens.map((address) => retrieveToken(chain, address.toLowerCase())) as Token[]).filter(isNotFalsy)
        : null,
      ...poolData,
    })
  }

  return yieldPools
}

export type BalanceMap = Map<`${Chain}-${string}`, Omit<YieldBalanceGroup, 'chain' | 'protocol'>>

export function parseBalances(yieldBalanceGroups: Array<YieldBalanceGroup>) {
  const balances: BalanceMap = new Map()

  if (yieldBalanceGroups.length === 0) return balances

  for (const yieldBalance of yieldBalanceGroups) {
    const chain = yieldBalance.chain.toLowerCase() as Chain
    if (!chainsNames.includes(chain)) continue
    const key: `${Chain}-${string}` = [chain, yieldBalance.protocol].join('-') as `${Chain}-${string}`
    balances.set(key, yieldBalance)
  }

  return balances
}
