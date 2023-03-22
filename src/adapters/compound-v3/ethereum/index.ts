import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { BalanceWithExtraProps, getHealthFactor } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'

import { getAssetsContracts, getLendBorrowBalances } from '../common/lend'
import { getRewardBalances } from '../common/rewards'
import { getStakeBalances } from '../common/stake'

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const CompoundUSDCv3: Contract = {
  chain: 'ethereum',
  address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  underlyings: [USDC],
}

const CompoundWETHv3: Contract = {
  chain: 'ethereum',
  address: '0xa17581a9e3356d9a858b789d68b4d866e593ae94',
  underlyings: [WETH],
}

const CompoundRewards: Contract = {
  chain: 'ethereum',
  address: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40',
}

export const getContracts = async (ctx: BaseContext) => {
  const assets = await getAssetsContracts(ctx, [CompoundUSDCv3, CompoundWETHv3])

  return {
    contracts: { compounders: [CompoundUSDCv3, CompoundWETHv3], assets, CompoundRewards },
  }
}

const compoundBalances = async (ctx: BalancesContext, compounders: Contract[], rewarder: Contract) => {
  return Promise.all([getStakeBalances(ctx, compounders), getRewardBalances(ctx, rewarder, compounders)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  console.log(contracts)

  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: (...args) => getLendBorrowBalances(...args, [CompoundUSDCv3, CompoundWETHv3]),
    compounders: (...args) => compoundBalances(...args, CompoundRewards),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
