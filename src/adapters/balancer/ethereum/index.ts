import { getBalancesBalances } from '@adapters/balancer/common/balance'
import { getLockerBalances } from '@adapters/balancer/ethereum/locker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import type { Token } from '@lib/token'

import { getBalancerPools } from '../common/pool'
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

const gaugeController: Contract = {
  chain: 'ethereum',
  address: '0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD',
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const oldUrl = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer'
const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

export const getContracts = async (ctx: BaseContext) => {
  const [oldPools, pools] = await Promise.all([
    getOldBalancerPools(ctx, oldUrl),
    getBalancerPools(ctx, url, gaugeController),
  ])

  return {
    contracts: { oldPools, pools, gaugeController, vault, votingEscrow },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBalancesBalances(...args, vault),
    oldPools: (ctx, oldPools) => getPoolsBalances(ctx, oldPools, { getPoolAddress: (pool) => pool.address }),
    votingEscrow: (...args) => getLockerBalances(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}
