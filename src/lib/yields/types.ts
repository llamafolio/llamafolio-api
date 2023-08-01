import type { Chain } from '@lib/chains'
import type { Address } from 'viem'

export interface YieldPool {
  chain: Chain
  project: string
  symbol: string
  tvlUsd: number
  apyBase: number
  apyReward: number
  apy: number
  rewardTokens: Address[] | null
  pool: string
  apyPct1D: number
  apyPct7D: number
  apyPct30D: number
  stablecoin: boolean
  ilRisk: string
  exposure: string
  predictions: {
    predictedClass: string
    predictedProbability: number
    binnedConfidence: number
  }
  poolMeta: any | null
  mu: number
  sigma: number
  count: number
  outlier: boolean
  underlyingTokens: Address[] | null
  il7d: any | null
  apyBase7d: any | null
  apyMean30d: number
  volumeUsd1d: any | null
  volumeUsd7d: any | null
  apyBaseInception: any | null
  pool_old: string
}

export interface YieldPoolResponse {
  status: string
  data: YieldPool[]
}
