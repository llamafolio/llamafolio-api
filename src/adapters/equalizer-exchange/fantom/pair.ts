import type { BaseContext, Contract } from '@lib/adapter'

export interface PairsResponse {
  success: string
  data: Pair[]
}

export interface Pair {
  address: string
  gaugesAddress: string
  token0: Token
  token1: Token
  symbol: string
  name: string
  stable: boolean
  decimals: string
  token0_address: string
  token1_address: string
  balance: number
  totalSupply: number
  reserve0: number
  reserve1: number
  claimable0: number
  claimable1: number
  gauge: Gauge
  tvl: number | null
  apr: number | null
}

export interface Gauge {
  address?: string
  external_bribe?: string
  internal_bribe?: string
  bribeAddress?: string
  bribe_address?: string
  feesAddress?: string
  fees_address?: string
  decimals?: number
  balance?: number
  totalSupply?: number
  bribes?: Bribe[]
  bribesi?: Bribe[]
  weight?: number
  weightPercent?: string
  reward?: number
  tbv?: number
  votes?: number
  apr?: number
  aprUsd?: number
  tbvUSD?: number
}

export interface Bribe {
  rewardAmmount: number
  reward_ammount: number
  token: Token
}

export interface Token {
  address: string
  name: string
  symbol: string
  decimals: string
  logoURI: string
  balance: number
  isWhitelisted: boolean
  price: number
  chainId: number
}

export interface GaugeContract extends Contract {
  token: `0x${string}`
  bribeAddress?: `0x${string}`
  feesAddress?: `0x${string}`
}

export async function getPairsContracts(ctx: BaseContext) {
  // use API directly as we need to look for transactions to retrieve gauges
  // TODO: fetch on-chain info
  const res = await fetch('https://eqapi.mindheartsoul.org/api/pairs')
  if (!res.ok) {
    throw new Error('failed to fetch pairs')
  }

  const json: PairsResponse = await res.json()

  const pairs: Contract[] = (json?.data || []).map((pair) => ({
    chain: ctx.chain,
    address: pair.address,
    stable: pair.stable,
    category: 'lp',
    underlyings: [pair.token0_address, pair.token1_address],
  }))

  const gauges: GaugeContract[] = (json?.data || [])
    .map((pair) => ({
      chain: ctx.chain,
      address: pair.gaugesAddress,
      token: pair.address,
      stable: pair.stable,
      bribeAddress: pair.gauge?.bribeAddress,
      feesAddress: pair.gauge?.feesAddress,
      underlyings: [pair.token0_address, pair.token1_address],
      rewards: pair.gauge?.bribes?.map((bribe) => bribe.token.address),
    }))
    .filter((gauge) => gauge.address)

  return { pairs, gauges }
}
