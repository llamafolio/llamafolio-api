import { getInchBalances } from '@adapters/1inch-network/common/farm'
import { get1InchLpBalances } from '@adapters/1inch-network/common/lp'
import { get1InchFarmPools, get1InchPools } from '@adapters/1inch-network/common/pool'
import { getInchStakingBalances } from '@adapters/1inch-network/common/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmingPoolsAddresses: `0x${string}`[] = ['0x5d0ec1f843c1233d304b96dbde0cab9ec04d71ef']

const factory: Contract = {
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
    get1InchPools(ctx, factory),
    get1InchFarmPools(ctx, farmingPoolsAddresses),
  ])

  return {
    contracts: { pools, farmingPools, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: get1InchLpBalances,
    farmingPools: getInchBalances,
    staker: getInchStakingBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1658534400,
}
