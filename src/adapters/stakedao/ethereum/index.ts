import {
  getStakeDaoBalBalances,
  getStakeDaoCurveBalances,
  getStakeDaoOldBalances,
} from '@adapters/stakedao/common/balance'
import {
  getDetailedBalancerPools,
  getStakeDaoContractsFromAPIs,
  getStakeDaoOldContractsFromApi,
} from '@adapters/stakedao/common/pool'
import { getStakeDaoStakingBalances } from '@adapters/stakedao/common/stake'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { resolveBalances } from '@lib/balance'

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

const gaugeInfos: Contract = {
  chain: 'ethereum',
  address: '0x2fFB7B215Ae7F088eC2530C7aa8E1B24E398f26a',
}

export const getContracts = async (ctx: BaseContext) => {
  const [oldPools, { curve, angle, balancer }] = await Promise.all([
    getStakeDaoOldContractsFromApi(ctx),
    groupBy(await getStakeDaoContractsFromAPIs(ctx, ['curve', 'balancer', 'angle']), 'provider'),
  ])

  const detailedBalancer = await getDetailedBalancerPools(ctx, balancer, url, gaugeInfos)

  return {
    contracts: {
      pools: [...curve, ...angle, ...detailedBalancer, ...oldPools],
    },
  }
}

const getStakeDaoBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  const sortedPools = groupBy(pools, 'provider')

  return Promise.all([
    getStakeDaoStakingBalances(ctx, pools),
    getStakeDaoCurveBalances(ctx, sortedPools['curve']),
    getStakeDaoBalBalances(ctx, sortedPools['balancer']),
    getStakeDaoOldBalances(ctx, sortedPools['oldPool']),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getStakeDaoBalances,
  })

  return {
    groups: [{ balances }],
  }
}
