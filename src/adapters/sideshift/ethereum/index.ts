import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getsvXAIBalances } from './balance'

const svXAI: Contract = {
  chain: 'ethereum',
  address: '0x3808708e761b988d23ae011ed0e12674fb66bd62',
  underlyings: ['0x35e78b3982E87ecfD5b3f3265B601c046cDBe232'],
  symbol: 'svXAI',
  decimals: 18,
}

export const getContracts = () => {
  return {
    contracts: { svXAI },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    svXAI: getsvXAIBalances,
  })

  return {
    groups: [{ balances }],
  }
}
