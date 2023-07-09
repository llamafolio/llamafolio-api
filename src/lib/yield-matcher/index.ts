import environment from '@environment'
import type { Chain } from '@lib/chains'
import { chainsNames } from '@lib/chains'
import { invariant } from '@lib/error'
import { retrieveToken } from '@lib/token'
import type { MapValueType } from '@lib/type'
import { isNotFalsy } from '@lib/type'
import type { Token } from '@llamafolio/tokens'
import { type Address, isAddress } from 'viem'

import type { YieldBalanceGroup, YieldBalancesJSON, YieldPoolResponse } from './types'

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
 * Next Steps: TBD
 *
 */

const testAddresses = [
  //
  '0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50',
] as const

matcher(testAddresses[0])
  .then((result) => console.log(JSON.stringify(result, undefined, 2)))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

export async function matcher(address: Address) {
  const yieldPools = await parseYieldsPools()
  const balances = await parseBalances(address)

  /**
   * This stores matches between yield pools and balances
   * A match here means yield pool & balance are for the same chain and protocol
   */
  const matches: Array<{
    key: string
    result: {
      yield: MapValueType<typeof yieldPools>
      balance: MapValueType<typeof balances>
    }
  }> = []

  for (const [key, value] of balances.entries()) {
    const match = yieldPools.get(key)
    if (match) matches.push({ key, result: { yield: match, balance: value } })
  }
  return matches
}

export async function parseYieldsPools() {
  const response = await fetch('https://yields.llama.fi/poolsOld')
  const json: YieldPoolResponse = await response.json()

  const yieldPools = new Map<
    `${Chain}-${string}`,
    ({
      pool: string
      tokens: Token[] | null
    } & Record<string, any>)[]
  >()

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

export async function parseBalances(address: Address) {
  invariant(isAddress(address), `Invalid address: ${address}`)

  const url = `${environment.API_URL ?? 'http://localhost:3000'}/balances/${address}`
  const response = await fetch(url)
  invariant(response.ok, `Failed to fetch balances for ${address} - ${response.status} (${response.statusText})`)

  const balances = new Map<`${Chain}-${string}`, Omit<YieldBalanceGroup, 'chain' | 'protocol'>>()

  const yieldBalancesJSON: YieldBalancesJSON = await response.json()

  if (yieldBalancesJSON.groups.length === 0) return balances

  for (const yieldBalance of yieldBalancesJSON['groups']) {
    const chain = yieldBalance.chain.toLowerCase() as Chain
    if (!chainsNames.includes(chain)) continue
    const key: `${Chain}-${string}` = [chain, yieldBalance.protocol].join('-') as `${Chain}-${string}`
    balances.set(key, yieldBalance)
  }

  return balances
}
