import { getAaveStakeBalances } from '@adapters/aave-v3/common/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '../common/lending'

const balancer_vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const stkAAVEwstETHBPTv2: Contract = {
  chain: 'ethereum',
  address: '0x9eda81c21c273a82be9bbc19b6a6182212068101',
  token: '0x3de27EFa2F1AA663Ae5D458857e731c129069F29',
  underlyings: ['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'],
  poolId: '0x3de27efa2f1aa663ae5d458857e731c129069f29000200000000000000000588',
  rewards: ['0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'],
}

const lendingPool: Contract = {
  name: 'Pool',
  displayName: 'Pool',
  chain: 'ethereum',
  address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
}

const poolDataProvider: Contract = {
  chain: 'ethereum',
  address: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool, poolDataProvider)

  return {
    contracts: {
      pools,
      stkAAVEwstETHBPTv2,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getLendingPoolBalances,
      stkAAVEwstETHBPTv2: (...args) => getAaveStakeBalances(...args, balancer_vault),
    }),
    getLendingPoolHealthFactor(ctx, lendingPool),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

export const config: AdapterConfig = {
  startDate: 1674604800,
}
