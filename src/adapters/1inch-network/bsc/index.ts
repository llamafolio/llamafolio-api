import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getInchFarmingPools, getInchPools } from '../common/contract'
import { getInchBalances } from '../common/farm'
import { getLpInchBalances } from '../common/lp'
import { getInchStakingBalances } from '../common/stake'

const farmingPoolsAddresses: `0x${string}`[] = ['0x5d0ec1f843c1233d304b96dbde0cab9ec04d71ef']

const poolDeployer: Contract = {
  chain: 'bsc',
  address: '0xd41b24bba51fac0e4827b6f94c0d6ddeb183cd64',
}

const staker: Contract = {
  chain: 'bsc',
  address: '0x73f0a6927a3c04e679074e70dfb9105f453e799d',
  decimals: 18,
  symbol: 'st1INCH',
  underlyings: ['0x111111111117dc0aa78b770fa6a738034120c302'],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, farmingPools] = await Promise.all([
    getInchPools(ctx, poolDeployer),
    getInchFarmingPools(ctx, farmingPoolsAddresses),
  ])

  return {
    contracts: { pools, farmingPools, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getLpInchBalances,
    farmingPools: getInchBalances,
    staker: getInchStakingBalances,
  })

  return {
    groups: [{ balances }],
  }
}
