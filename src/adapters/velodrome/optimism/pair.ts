import { BaseContext, Contract } from '@lib/adapter'
import fetch from 'node-fetch'

export interface PairsResponse {
  data: Pair[]
}

export interface Pair {
  tvl: number
  apr: number
  address: string
  symbol: string
  decimals: number
  stable: boolean
  total_supply: number
  reserve0: number
  reserve1: number
  token0_address: string
  token1_address: string
  gauge_address: string
  isStable: boolean
  totalSupply: number
  token0: Token
  token1: Token
  gauge?: Gauge
}

export interface Gauge {
  decimals: number
  fees: number
  tbv: number
  votes: number
  apr: number
  address: string
  total_supply: number
  bribe_address: string
  fees_address: string
  wrapped_bribe_address: null | string
  reward: number
  bribeAddress: string
  feesAddress: string
  totalSupply: number
  bribes: Bribe[]
}

export interface Bribe {
  token: Token
  reward_ammount: number
  rewardAmmount: number
}

export interface Token {
  price: number
  nativeChainAddress: string | null
  nativeChainId: number | null
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: null | string
}

export interface PairContract extends Contract {
  gaugeAddress?: string
  bribeAddress?: string
  feesAddress?: string
}

export async function getPairsContracts(ctx: BaseContext) {
  // use API directly as we need to look for transactions to retrieve gauges
  // TODO: fetch on-chain info
  const res = await fetch('https://api.velodrome.finance/api/v1/pairs')
  const json: PairsResponse = await res.json()

  const pairs: PairContract[] = (json?.data || []).map((pair) => ({
    chain: ctx.chain,
    address: pair.address,
    stable: pair.stable,
    category: 'lp',
    underlyings: [pair.token0_address, pair.token1_address],
  }))

  const gauges: PairContract[] = (json?.data || [])
    .map((pair) => ({
      chain: ctx.chain,
      address: pair.gauge_address,
      stable: pair.stable,
      bribeAddress: pair.gauge?.bribeAddress,
      feesAddress: pair.gauge?.feesAddress,
      underlyings: [pair.token0_address, pair.token1_address],
      rewards: pair.gauge?.bribes?.map((bribe) => bribe.token.address),
    }))
    .filter((gauge) => gauge.address)

  return { pairs, gauges }
}
