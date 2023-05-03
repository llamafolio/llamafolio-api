import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLpLyraBalances } from '../common/lp'
import { getLyraStakeBalances } from '../common/stake'

const lyraEthMarketLp: Contract = {
  chain: 'optimism',
  address: '0x5db73886c4730dbf3c562ebf8044e19e8c93843e',
  decimals: 18,
  symbol: 'Ly-wETH-pt',
  underlyings: ['0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9'],
  lpToken: '0x5db73886c4730dbf3c562ebf8044e19e8c93843e',
  staker: '0x0d1a91354a387a1e9e8fcd8f576670c4c3b723ca',
}

const lyraBTCMarketLp: Contract = {
  chain: 'optimism',
  address: '0x3c73cd65d708a5c951f0cc19a4d0bb6559ae20c5',
  decimals: 18,
  symbol: 'Ly-wBTC-pt',
  underlyings: ['0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9'],
  lpToken: '0x3c73cd65d708a5c951f0cc19a4d0bb6559ae20c5',
  staker: '0x95fe3e7411f295a0da6ab14b4cd91f666b9f8b8a',
}

const lyraSOLMarketLp: Contract = {
  chain: 'optimism',
  address: '0xa33c1963d74d203df6bffdfda3bff39a1d76e1d0',
  decimals: 18,
  symbol: 'Ly-wSOL-pt',
  underlyings: ['0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9'],
  lpToken: '0xa33c1963d74d203df6bffdfda3bff39a1d76e1d0',
  staker: '0xbce213d2a902a3b3b9d194a57f899a7d292d2431',
}

const stakers: Contract[] = [
  {
    chain: 'optimism',
    address: '0xde48b1b5853cc63b1d05e507414d3e02831722f8',
    decimals: 18,
    underlyings: ['0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
    symbol: 'stkLYRA',
    rewards: ['0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
  },
  {
    chain: 'optimism',
    address: '0x0f5d45a7023612e9e244fe84fac5fcf3740d1492',
    decimals: 18,
    underlyings: ['0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
    symbol: 'stkLYRA',
    rewards: ['0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
  },
  {
    chain: 'optimism',
    address: '0xb02e538a08cfa00e9900cf94e33b161323d8d162',
    decimals: 18,
    underlyings: ['0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
    symbol: 'stkLYRA',
    rewards: ['0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
  },
]

export const getContracts = () => {
  return {
    contracts: { lpMarkets: [lyraEthMarketLp, lyraBTCMarketLp, lyraSOLMarketLp], stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lpMarkets: getLpLyraBalances,
    stakers: getLyraStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
