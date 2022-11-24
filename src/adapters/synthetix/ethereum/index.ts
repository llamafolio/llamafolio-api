import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getLendBorrowBalances } from '../common/lend'
import { getVestBalances } from '../common/vest'

const SNX: Token = {
  chain: 'ethereum',
  decimals: 18,
  address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
  symbol: 'SNX',
}

const sUSD: Token = {
  symbol: 'sUSD',
  address: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
  decimals: 18,
  chain: 'ethereum',
}

const synthetix: Contract = {
  name: 'Synthetix',
  chain: 'ethereum',
  symbol: 'SNX',
  decimals: 18,
  address: '0x08f30ecf2c15a783083ab9d5b9211c22388d0564',
  underlyings: [SNX],
}

const feePool: Contract = {
  name: 'FeePool',
  chain: 'ethereum',
  address: '0x3b2f389aee480238a49e3a9985cd6815370712eb',
}

const rewardEscrow: Contract = {
  name: 'Reward Escrow v2',
  chain: 'ethereum',
  address: '0xAc86855865CbF31c8f9FBB68C749AD5Bd72802e3',
  underlyings: [SNX],
}

const liquidatorReward: Contract = {
  name: 'Liquidator Reward',
  chain: 'ethereum',
  address: '0xf79603a71144e415730C1A6f57F366E4Ea962C00',
  underlyings: [SNX],
}

export const getContracts = async () => {
  return {
    contracts: { synthetix, feePool, sUSD, rewardEscrow, liquidatorReward },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    synthetix: (...args) => getLendBorrowBalances(...args, feePool, sUSD),
    rewardEscrow: (...args) => getVestBalances(...args, liquidatorReward),
  })

  return {
    balances,
  }
}
