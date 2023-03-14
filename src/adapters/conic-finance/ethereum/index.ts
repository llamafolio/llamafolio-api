import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getConicBalances } from './balance'
import { getlpTokensContracts } from './contract'

const stakers: string[] = [
  '0x07b577f10d4e00f3018542d08a87f255a49175a5', // USDC
  // '0x3f41480dd3b32f1cc579125f9570dccd07e07667', // Locker CNC
  '0xabb735648a076d570aff2a61d8d141099823eae9', // DAI
  '0x40293380f5292bb13905608b35a936c332f07f94', // FRAX
  // '0x5f2e1ac047e6a8526f8640a7ed8ab53a0b3f4acf', // Locker CNC v2
]

const lpTokenStaker: Contract = {
  chain: 'ethereum',
  address: '0xeC037423A61B634BFc490dcc215236349999ca3d',
}

export const getContracts = async (ctx: BaseContext) => {
  const lpTokens = await getlpTokensContracts(ctx, stakers)

  return {
    contracts: { lpTokenStaker, lpTokens },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lpTokens: (...args) => getConicBalances(...args, lpTokenStaker),
  })

  return {
    groups: [{ balances }],
  }
}
