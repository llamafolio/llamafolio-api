import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'

import { getBalancerPoolsBalances, getLpBalancerPoolsBalances } from '../common/balance'
import { getBalancerPools } from '../common/pool'
import { getLockerBalances } from './locker'
import { getOldBalancerPools } from './pool'

const BAL: Token = {
  chain: 'ethereum',
  address: '0xba100000625a3754423978a60c9317c58a424e3D',
  decimals: 18,
  symbol: 'BAL',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const B_80BAL_20WETH: Contract = {
  chain: 'ethereum',
  address: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56',
  decimals: 18,
  symbol: 'B_80BAL_20WETH',
  underlyings: [BAL, WETH],
  poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
}

const votingEscrow: Contract = {
  chain: 'ethereum',
  address: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
  underlyings: [B_80BAL_20WETH],
  decimals: 18,
  symbol: 'veBAL',
}

const gaugeInfos: Contract = {
  chain: 'ethereum',
  address: '0x2fFB7B215Ae7F088eC2530C7aa8E1B24E398f26a',
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const oldUrl = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer'
const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

export const getContracts = async (ctx: BaseContext) => {
  const oldPools = await getOldBalancerPools(ctx, oldUrl)
  const pools = await getBalancerPools(ctx, url, gaugeInfos)

  return {
    contracts: { oldPools, pools, gaugeInfos, vault, votingEscrow },
  }
}

const getBalancerBalances = async (ctx: BalancesContext, pools: Contract[], vault: Contract) => {
  return Promise.all([getBalancerPoolsBalances(ctx, pools, vault), getLpBalancerPoolsBalances(ctx, pools, vault)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    oldPools: (ctx, oldPools) => getPoolsBalances(ctx, oldPools, { getPoolAddress: (pool) => pool.address }),
    pools: (...args) => getBalancerBalances(...args, vault),
    votingEscrow: (...args) => getLockerBalances(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}
