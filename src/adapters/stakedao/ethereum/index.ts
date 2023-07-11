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
import { getStakeDaoStakingBalances, getStakeDaoXSDTBalance } from '@adapters/stakedao/common/stake'
import { getStakeDaoVestBalances } from '@adapters/stakedao/common/vest'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

const SDT: Token = {
  chain: 'ethereum',
  address: '0x73968b9a57c6E53d41345FD57a6E6ae27d6CDB2F',
  decimals: 18,
  symbol: 'SDT',
}

const xSDT: Contract = {
  chain: 'ethereum',
  address: '0xac14864ce5a98af3248ffbf549441b04421247d3',
  decimals: 18,
  symbol: 'xSDT',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x0c30476f66034e11782938df8e4384970b6c9e8a',
  underlyings: ['0x73968b9a57c6E53d41345FD57a6E6ae27d6CDB2F'],
}

const vesters: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xc78fa2af0ca7990bb5ff32c9a728125be58cf247',
    token: '0x73968b9a57c6E53d41345FD57a6E6ae27d6CDB2F',
  },
  {
    chain: 'ethereum',
    address: '0x5d7f9570c8af43c8e5657b1fc3c11944e4182827',
    token: '0x73968b9a57c6E53d41345FD57a6E6ae27d6CDB2F',
  },
]

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
      locker,
      vesters,
      xSDT,
    },
  }
}

const getStakeDaoBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  const sortedPools = groupBy(pools, 'provider')

  return Promise.all([
    getStakeDaoStakingBalances(ctx, pools),
    getStakeDaoCurveBalances(ctx, sortedPools['curve'] || []),
    getStakeDaoBalBalances(ctx, sortedPools['balancer'] || []),
    getStakeDaoOldBalances(ctx, sortedPools['oldPool'] || []),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getStakeDaoBalances,
    locker: (...args) => getSingleLockerBalance(...args, SDT, 'locked'),
    vesters: getStakeDaoVestBalances,
    xSDT: getStakeDaoXSDTBalance,
  })

  return {
    groups: [{ balances }],
  }
}
