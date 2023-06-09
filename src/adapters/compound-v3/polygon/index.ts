import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

import { getAssetsContracts, getLendBorrowBalances } from '../common/lend'
import { getRewardBalances } from '../common/rewards'
import { getStakeBalances } from '../common/stake'

const USDC: Token = {
  chain: 'polygon',
  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  decimals: 6,
  symbol: 'USDC',
}

const CompoundUSDCv3: Contract = {
  chain: 'polygon',
  address: '0xF25212E676D1F7F89Cd72fFEe66158f541246445',
  underlyings: [USDC],
}

const CompoundRewards: Contract = {
  chain: 'polygon',
  address: '0x45939657d1CA34A8FA39A924B71D28Fe8431e581',
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
