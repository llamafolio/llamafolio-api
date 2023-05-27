import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMarketsBalances, getMarketsContracts } from '../common/markets'
import { getMStakeBalance, getMStakeContract } from '../common/mStake'

const mSPELL: Contract = {
  name: 'mSpellStaking',
  chain: 'arbitrum',
  address: '0x1df188958a8674b5177f77667b8d173c3cdd9e51',
  decimals: 18,
  symbol: 'mSPELL',
}

const MIM: Contract = {
  name: 'Magic Internet Money',
  address: '0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a',
  chain: 'arbitrum',
  symbol: 'MIM',
  decimals: 18,
  coingeckoId: 'magic-internet-money',
  stable: true,
  wallet: true,
}

const cauldrons: `0x${string}`[] = [
  //  v2
  '0xC89958B03A55B5de2221aCB25B58B89A000215E6', // WETH
  '0x5698135CA439f21a57bDdbe8b582C62f090406D5', // GLP Self-Repaying
]

export const getContracts = async (ctx: BaseContext) => {
  const [mStakeContracts, marketsContracts] = await Promise.all([
    getMStakeContract(ctx, mSPELL),
    getMarketsContracts(ctx, cauldrons),
  ])

  return {
    contracts: { mStakeContracts, marketsContracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mStakeContracts: getMStakeBalance,
    marketsContracts: (ctx, markets) => getMarketsBalances(ctx, markets, MIM),
  })

  return {
    groups: [{ balances }],
  }
}
