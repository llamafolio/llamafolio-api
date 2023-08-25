import { getAuraBalStakerBalances, getAuraFarmBalances } from '@adapters/aura/ethereum/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMultipleLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

import { getAuraPools } from '../common/pool'

const auraBal: Token = {
  chain: 'ethereum',
  address: '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d',
  decimals: 18,
  symbol: 'auraBAL',
}

const AURA: Token = {
  chain: 'ethereum',
  address: '0xc0c293ce456ff0ed870add98a0828dd4d2903dbf',
  decimals: 18,
  symbol: 'AURA',
}

const auraLocker: Contract = {
  chain: 'ethereum',
  address: '0x3Fa73f1E5d8A792C80F426fc8F84FBF7Ce9bBCAC',
  symbol: 'vlAURA',
  decimals: 18,
  underlyings: [AURA],
  rewards: [auraBal],
}

const auraStaker: Contract = {
  chain: 'ethereum',
  address: '0x00A7BA8Ae7bca0B10A32Ea1f8e2a1Da980c6CAd2',
  underlyings: [auraBal],
}

const booster: Contract = {
  chain: 'ethereum',
  address: '0xA57b8d98dAE62B26Ec3bcC4a365338157060B234',
}

const vaultBAL: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getAuraPools(ctx, booster, vaultBAL)

  return {
    contracts: { booster, pools, auraStaker, auraLocker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    auraStaker: getAuraBalStakerBalances,
    auraLocker: (...args) => getMultipleLockerBalances(...args, AURA, [auraBal], false),
    pools: (...args) => getAuraFarmBalances(...args, vaultBAL),
  })

  return {
    groups: [{ balances }],
  }
}
