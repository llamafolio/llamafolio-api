import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getCNCLockerBalances, getConicBalances, getConicFarmBalances } from './balance'
import { getlpTokensContracts } from './contract'

const stakers: string[] = [
  '0x07b577f10d4e00f3018542d08a87f255a49175a5', // USDC
  '0xabb735648a076d570aff2a61d8d141099823eae9', // DAI
  '0x40293380f5292bb13905608b35a936c332f07f94', // FRAX
]

const CNCLockerV1: Contract = {
  chain: 'ethereum',
  address: '0x3f41480dd3b32f1cc579125f9570dccd07e07667',
  underlyings: ['0x9aE380F0272E2162340a5bB646c354271c0F5cFC'],
}

const CNCLockerV2: Contract = {
  chain: 'ethereum',
  address: '0x5f2e1ac047e6a8526f8640a7ed8ab53a0b3f4acf',
  underlyings: ['0x9aE380F0272E2162340a5bB646c354271c0F5cFC'],
}

const CNC_ETH: Contract = {
  chain: 'ethereum',
  address: '0xc67e9cdf599369130dd0841ee5cb8ebf9bb661c4',
  lpToken: '0xF9835375f6b268743Ea0a54d742Aa156947f8C06',
  pool: '0x838af967537350D2C44ABB8c010E49E32673ab94',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0x9aE380F0272E2162340a5bB646c354271c0F5cFC'],
  rewards: ['0x9aE380F0272E2162340a5bB646c354271c0F5cFC'],
}

const lpTokenStaker: Contract = {
  chain: 'ethereum',
  address: '0xeC037423A61B634BFc490dcc215236349999ca3d',
}

export const getContracts = async (ctx: BaseContext) => {
  const lpTokens = await getlpTokensContracts(ctx, stakers)

  return {
    contracts: { lpTokenStaker, lpTokens, lockers: [CNCLockerV1, CNCLockerV2], CNC_ETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lpTokens: (...args) => getConicBalances(...args, lpTokenStaker),
    lockers: getCNCLockerBalances,
    CNC_ETH: getConicFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
