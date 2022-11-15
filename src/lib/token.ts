import { Chain } from '@lib/chains'

export const ETH_ADDR = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export interface Token {
  chain: Chain
  address: string
  symbol: string
  decimals: number
  native?: boolean
  coingeckoId?: string
  // optional token used to retrieve price.
  // ex: WETH -> ETH
  priceSubstitute?: string
}
