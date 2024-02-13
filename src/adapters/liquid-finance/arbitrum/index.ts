import { getLIQDLockBalances } from '@adapters/liquid-finance/arbitrum/locker'
import { getLiquidPendingRewards, getLiquidPoolInfos } from '@adapters/liquid-finance/arbitrum/masterChef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const LIQD: Contract = {
  chain: 'arbitrum',
  address: '0x93c15cd7de26f07265f0272e0b831c5d7fab174f',
  decimals: 18,
  symbol: 'LIQD',
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x2582ffea547509472b3f12d94a558bb83a48c007',
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0xa1a988a22a03cbe0cf089e3e7d2e6fcf9bd585a9',
  token: '0x93C15cd7DE26f07265f0272E0b831C5D7fAb174f',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: getLiquidPoolInfos,
  })

  return {
    contracts: { locker, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getLIQDLockBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: LIQD,
        getUserPendingRewards: getLiquidPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1661731200,
}
