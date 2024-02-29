import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getCNCLockerBalances, getConicBalances, getConicFarmBalances } from './balance'
import { getlpTokensContracts } from './contract'

const CNCLockerV1: Contract = {
  chain: 'ethereum',
  address: '0x3f41480dd3b32f1cc579125f9570dccd07e07667',
  token: '0x9aE380F0272E2162340a5bB646c354271c0F5cFC',
}

const CNCLockerV2: Contract = {
  chain: 'ethereum',
  address: '0x5f2e1ac047e6a8526f8640a7ed8ab53a0b3f4acf',
  token: '0x9aE380F0272E2162340a5bB646c354271c0F5cFC',
}

const CNCLockerV3: Contract = {
  chain: 'ethereum',
  address: '0x8b318d1d27ee1e4329d88f0c1e9bc3a1025b2c93',
  token: '0x9aE380F0272E2162340a5bB646c354271c0F5cFC',
}

const CNCLockerV4: Contract = {
  chain: 'ethereum',
  address: '0x3367070ed152e2b715eef48d157685cf496f3543',
  token: '0x9aE380F0272E2162340a5bB646c354271c0F5cFC',
}

const CNC_ETH: Contract = {
  chain: 'ethereum',
  address: '0xc67e9cdf599369130dd0841ee5cb8ebf9bb661c4',
  lpToken: '0xF9835375f6b268743Ea0a54d742Aa156947f8C06',
  pool: '0x838af967537350D2C44ABB8c010E49E32673ab94',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0x9aE380F0272E2162340a5bB646c354271c0F5cFC'],
  rewards: ['0x9aE380F0272E2162340a5bB646c354271c0F5cFC'],
}

const controller: Contract = {
  chain: 'ethereum',
  address: '0x013A3Da6591d3427F164862793ab4e388F9B587e',
}

const omnipoolsController: Contract = {
  chain: 'ethereum',
  address: '0x2790ec478f150a98f5d96755601a26403df57eae',
}

const lpTokenStaker: Contract = {
  chain: 'ethereum',
  address: '0xeC037423A61B634BFc490dcc215236349999ca3d',
}

const lpTokenOmniStaker: Contract = {
  chain: 'ethereum',
  address: '0xa5241560306298efb9ed80b87427e664ffff0cf9',
}

export const getContracts = async (ctx: BaseContext) => {
  const [lpTokens, omniPools] = await Promise.all([
    getlpTokensContracts(ctx, controller),
    getlpTokensContracts(ctx, omnipoolsController),
  ])

  return {
    contracts: {
      lpTokenStaker,
      lpTokens,
      omniPools,
      lockers: [CNCLockerV1, CNCLockerV2, CNCLockerV3, CNCLockerV4],
      CNC_ETH,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lpTokens: (...args) => getConicBalances(...args, lpTokenStaker),
    omniPools: (...args) => getConicBalances(...args, lpTokenOmniStaker),
    lockers: getCNCLockerBalances,
    CNC_ETH: getConicFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1677628800,
}
