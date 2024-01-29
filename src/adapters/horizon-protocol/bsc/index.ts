import { getHorizonFarmBalances } from '@adapters/horizon-protocol/bsc/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  {
    chain: 'bsc',
    address: '0x84838d0ab37857fad5979fcf6bddf8ddb1cc1da8',
    token: '0xdc9a574b9b341d4a98ce29005b614e1e27430e74',
    underlyings: ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', '0xc0eff7749b125444953ef89682201fb8c6a917cd'],
    rewards: ['0xc0eff7749b125444953ef89682201fb8c6a917cd'],
  },
  {
    chain: 'bsc',
    address: '0x5646aa2f9408c7c2ee1dc7db813c8b687a959a85',
    token: '0xc3bf4e0ea6b76c8edd838e14be2116c862c88bdf',
    underlyings: ['0xe9e7cea3dedca5984780bafc599bd69add087d56', '0xf0186490b18cb74619816cfc7feb51cdbe4ae7b9'],
    rewards: ['0xc0eff7749b125444953ef89682201fb8c6a917cd'],
  },
  {
    chain: 'bsc',
    address: '0x307326d24b5287b12f8079ba3854d9f7e7a139e1',
    token: '0x608d2fafbbca409a60d2acb5d41ddd37642a1275',
    pool: '0x51d5B7A71F807C950A45dD8b1400E83826Fc49F3',
    factory: '0xf65bed27e96a367c61e0e06c54e14b16b84a5870',
    underlyings: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '0x6DEdCEeE04795061478031b1DfB3c1ddCA80B204'],
    rewards: ['0xc0eff7749b125444953ef89682201fb8c6a917cd'],
    provider: 'curve',
  },
  {
    chain: 'bsc',
    address: '0xa1771dcfb7822c8853d7e64b86e58f7f1eb5e33e',
    token: '0x0409633a72d846fc5bbe2f98d88564d35987904d',
    rewards: ['0xc0eff7749b125444953ef89682201fb8c6a917cd'],
  },
  {
    chain: 'bsc',
    address: '0x67d5a94f444df4bba254645065a4137fc665bf98',
    token: '0xc0eff7749b125444953ef89682201fb8c6a917cd',
    rewards: ['0xc0eff7749b125444953ef89682201fb8c6a917cd'],
  },
  {
    chain: 'bsc',
    address: '0xd4552f3e19b91bed5ef2c76a67abdbffed5caeec',
    token: '0xdff88a0a43271344b760b58a35076bf05524195c',
    rewards: ['0xc0eff7749b125444953ef89682201fb8c6a917cd'],
  },
]

export const getContracts = () => {
  return {
    contracts: { farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getHorizonFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1636761600,
}
