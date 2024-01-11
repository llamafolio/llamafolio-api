import { getITPFarmBalance } from '@adapters/interport-finance/common/farm'
import { getUnderlyingsITP, getUserPendingITP } from '@adapters/interport-finance/common/masterChef'
import { getITPVestBalances } from '@adapters/interport-finance/common/vest'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import type { Token } from '@lib/token'

const ITP: Token = {
  chain: 'ethereum',
  address: '0x2b1D36f5B61AdDAf7DA7ebbd11B35FD8cfb0DE31',
  symbol: 'ITP',
  decimals: 18,
}

const ETH_ITP: Contract = {
  chain: 'ethereum',
  address: '0x646de66c9a08abf0976869de259e4b12d06f66ac',
  token: '0x4db2C7dd361379134140ffb9D85248e8498008E4',
  underlyings: ['0x2b1D36f5B61AdDAf7DA7ebbd11B35FD8cfb0DE31', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  rewards: [
    '0x2b1D36f5B61AdDAf7DA7ebbd11B35FD8cfb0DE31',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  ],
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x29d44c17f4f83b3c77ae2eac4bc1468a496e3196',
}

export const getContracts = async (ctx: BaseContext) => {
  const stablePools = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getUnderlyings: getUnderlyingsITP,
  })

  return {
    contracts: { stablePools, ETH_ITP },
  }
}

async function stableITPBalances(ctx: BalancesContext, pools: Contract[]) {
  const [masterChefPoolBalances, vestedBalances] = await Promise.all([
    getMasterChefPoolsBalances(ctx, pools, {
      masterChefAddress: masterChef.address,
      rewardToken: ITP,
      getUserPendingRewards: getUserPendingITP,
    }),
    getITPVestBalances(ctx, pools, masterChef.address),
  ])

  return [...vestedBalances, ...masterChefPoolBalances]
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stablePools: stableITPBalances,
    ETH_ITP: getITPFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}
