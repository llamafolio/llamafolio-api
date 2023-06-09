import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

import { getAssetsContracts, getLendBorrowBalances } from '../common/lend'
import { getRewardBalances } from '../common/rewards'
import { getStakeBalances } from '../common/stake'

const USDC: Token = {
  chain: 'arbitrum',
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 6,
  symbol: 'USDC',
}

const CompoundUSDCv3: Contract = {
  chain: 'arbitrum',
  address: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
  underlyings: [USDC],
}

const CompoundRewards: Contract = {
  chain: 'arbitrum',
  address: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae',
}

export const getContracts = async (ctx: BaseContext) => {
  const assets = await getAssetsContracts(ctx, [CompoundUSDCv3])

  return {
    contracts: { compounders: [CompoundUSDCv3], assets, CompoundRewards },
  }
}

const compoundBalances = async (ctx: BalancesContext, compounders: Contract[], rewarder: Contract) => {
  return Promise.all([getStakeBalances(ctx, compounders), getRewardBalances(ctx, rewarder, compounders)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: (...args) => getLendBorrowBalances(...args, [CompoundUSDCv3]),
    compounders: (...args) => compoundBalances(...args, CompoundRewards),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
