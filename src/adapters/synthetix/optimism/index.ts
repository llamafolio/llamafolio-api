import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getLendBorrowBalances } from '../common/lend'
import { getVestBalances } from '../common/vest'

const SNX: Token = {
  chain: 'optimism',
  decimals: 18,
  address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4',
  symbol: 'SNX',
}

const sUSD: Token = {
  symbol: 'sUSD',
  address: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
  decimals: 18,
  chain: 'optimism',
}

const synthetix: Contract = {
  name: 'Synthetix',
  chain: 'optimism',
  symbol: 'SNX',
  decimals: 18,
  address: '0xfe8e48bf36ccc3254081ec8c65965d1c8b2e744d',
  underlyings: [SNX],
}

const feePool: Contract = {
  name: 'FeePool',
  chain: 'optimism',
  address: '0xD3739A5F06747e148E716Dcb7147B9BA15b70fcc',
}

const rewardEscrow: Contract = {
  name: 'Reward Escrow v2',
  chain: 'optimism',
  address: '0x6330D5F08f51057F36F46d6751eCDc0c65Ef7E9e',
  underlyings: [SNX],
}

const liquidatorReward: Contract = {
  name: 'Liquidator Reward',
  chain: 'optimism',
  address: '0x61C7BC9b335e083c30C8a81b93575c361cdE93E2',
  underlyings: [SNX],
}

export const getContracts = async () => {
  return {
    contracts: { synthetix, feePool, sUSD, rewardEscrow, liquidatorReward },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    synthetix: (...args) => getLendBorrowBalances(...args, feePool, sUSD),
    rewardEscrow: (...args) => getVestBalances(...args, liquidatorReward),
  })

  return {
    groups: [{ balances }],
  }
}
