import { BaseContext, Contract } from '@lib/adapter'
import { gql, request } from 'graphql-request'

const THE_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/solidlizardfinance/sliz'

const pairsQuery = gql`
  {
    pairs(first: 1000) {
      id
      name
      symbol
      isStable
      reserve0
      reserve1
      token0Price
      token1Price
      totalSupply
      reserveUSD
      reserveETH
      token0 {
        id
        symbol
        name
        decimals
        isWhitelisted
        derivedETH
      }
      token1 {
        id
        symbol
        name
        decimals
        isWhitelisted
        derivedETH
      }
      gauge {
        id
        totalSupply
        totalSupplyETH
        expectAPR
        expectAPRDerived
        voteWeight
        totalWeight
        totalDerivedSupply
        bribe {
          id
        }
        rewardTokens {
          apr
          derivedAPR
          left
          finishPeriod
          token {
            id
            symbol
            decimals
            derivedETH
          }
        }
      }
      gaugebribes {
        id
        bribeTokens {
          apr
          left
          token {
            symbol
          }
        }
      }
    }
  }
`

export interface PairsResponse {
  pairs: Pair[]
}

export interface Pair {
  id: string
  name: string
  symbol: string
  isStable: boolean
  reserve0: string
  reserve1: string
  token0Price: string
  token1Price: string
  totalSupply: string
  reserveUSD: string
  reserveETH: string
  token0: Token0Class
  token1: Token0Class
  gauge: Gauge | null
  gaugebribes: Gaugebribes | null
}

export interface Gauge {
  id: string
  totalSupply: string
  totalSupplyETH: string
  expectAPR: string
  expectAPRDerived: string
  voteWeight: string
  totalWeight: string
  totalDerivedSupply: string
  bribe: Bribe
  rewardTokens: RewardToken[]
}

export interface Bribe {
  id: string
}

export interface RewardToken {
  apr: string
  derivedAPR: string
  left: string
  finishPeriod: string
  token: RewardTokenToken
}

export interface RewardTokenToken {
  id: string
  symbol: string
  decimals: string
  derivedETH: string
}

export interface Gaugebribes {
  id: string
  bribeTokens: BribeToken[]
}

export interface BribeToken {
  apr: string
  left: string
  token: BribeTokenToken
}

export interface BribeTokenToken {
  symbol: string
}

export interface Token0Class {
  id: string
  symbol: string
  name: string
  decimals: string
  isWhitelisted: boolean
  derivedETH: string
}

export interface GaugeContract extends Contract {
  token: string
  bribeAddress?: string
  feesAddress?: string
}

export async function getPairsContracts(ctx: BaseContext) {
  const pairsRes: PairsResponse = await request(THE_GRAPH_URL, pairsQuery)

  const pairs: Contract[] = (pairsRes.pairs || []).map((pair) => ({
    chain: ctx.chain,
    address: pair.id,
    stable: pair.isStable,
    category: 'lp',
    underlyings: [pair.token0.id, pair.token1.id],
  }))

  const gauges: GaugeContract[] = (pairsRes.pairs || [])
    .filter((pair) => pair.gauge)
    .map((pair) => ({
      chain: ctx.chain,
      address: pair.gauge!.id,
      token: pair.id,
      stable: pair.isStable,
      underlyings: [pair.token0.id, pair.token1.id],
    }))

  return { pairs, gauges }
}
