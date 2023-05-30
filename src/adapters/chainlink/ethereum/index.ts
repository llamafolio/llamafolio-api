import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getChainlinkStakerBalance } from './balance'

const link: Contract = {
  chain: 'ethereum',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  staker: '0x3feb1e09b4bb0e7f0387cee092a52e85797ab889',
  decimals: 18,
  symbol: 'LINK',
}

export const getContracts = async () => {
  return {
    contracts: { link },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    link: getChainlinkStakerBalance,
  })

  return {
    groups: [{ balances }],
  }
}
