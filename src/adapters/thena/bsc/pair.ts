import { BaseContext, Contract } from '@lib/adapter'

export interface PairsResponse {
  success: boolean
  data: Pair[]
  meta: Meta
}

export interface Pair {
  address: string
  symbol: string
  totalSupply: number
  tvl: number
  isStable: boolean
  gauge: Gauge
  token0: Token
  token1: Token
  isValid: boolean
}

export interface Gauge {
  tvl: number
  apr: number
  projectedApr: number
  voteApr: number
  totalSupply: number
  address: string
  fee: string
  bribe: string
  weight: number
  weightPercent: number
  bribesInUsd: number
  bribes: Bribes | null
}

export interface Bribes {
  fee: Bribe[] | null
  bribe: Bribe[] | null
}

export interface Bribe {
  amount: string
  symbol: string
  address: string
  decimals: number
}

export interface Token {
  address: string
  symbol: string
  decimals: number
  reserve: number
  logoURI: string
}

export interface Meta {
  total_supply: number
  circulating_supply: number
  locked_supply: number
}

export interface GaugeContract extends Contract {
  token: string
  bribeAddress?: string
  feesAddress?: string
}

export async function getPairsContracts(ctx: BaseContext) {
  // use API directly as we need to look for transactions to retrieve gauges
  // TODO: fetch on-chain info
  const res = await fetch('https://api.thena.fi/api/v1/pools')
  if (!res.ok) {
    throw new Error('failed to fetch pairs')
  }

  const json: PairsResponse = await res.json()

  const pairs: Contract[] = (json?.data || []).map((pair) => ({
    chain: ctx.chain,
    address: pair.address,
    stable: pair.isStable,
    category: 'lp',
    underlyings: [pair.token0.address, pair.token1.address],
  }))

  const gauges: GaugeContract[] = (json?.data || [])
    .map((pair) => ({
      chain: ctx.chain,
      address: pair.gauge.address,
      token: pair.address,
      stable: pair.isStable,
      bribeAddress: pair.gauge.bribe,
      feesAddress: pair.gauge.fee,
      underlyings: [pair.token0.address, pair.token1.address],
    }))
    .filter((gauge) => gauge.address)

  return { pairs, gauges }
}
