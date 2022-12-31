import { Chain } from '@lib/chains'

export interface IndexerTokenInteraction {
  token: string
  chain: Chain
  token_details: {
    decimals: number
    name: string
    symbol: string
  }
}

export interface IndexerContractsInteracted {
  contract: string
  chain: Chain
  adapter_id: {
    adapter_id: string
  }
}

export interface IndexerToken {
  decimals: number
  chain: Chain
  name: string
  symbol: string
  address: string
}
