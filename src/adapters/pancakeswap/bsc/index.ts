import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import {
  getMasterChefBalances,
  getMasterChefPoolsInfo,
  masterChefLpPoolInfoMethod,
  masterChefPendingRewardsMethod,
} from '@lib/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'bsc',
  address: '0x73feaa1eE314F8c655E354234017bE2193C9E24E',
}

const masterChef2: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef 2',
  chain: 'bsc',
  address: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652', // Legacy MasterChef
}

const cake: Token = {
  chain: 'bsc',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'CAKE',
  decimals: 18,
}

export const getContracts = async () => {
  const [pairs, masterChefPools, masterChefPools2] = await Promise.all([
    getPairsContracts({
      chain: 'bsc',
      factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      length: 100,
    }),

    getMasterChefPoolsInfo({
      masterChef,
    }),

    getMasterChefPoolsInfo({
      masterChef: masterChef2,
      poolInfoMethod: masterChefLpPoolInfoMethod, // lpToken address is in a different method from poolInfo
    }),
  ])

  // retrieve master chef pools details from lpToken addresses
  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairs) {
    pairByAddress[pair.address.toLowerCase()] = pair
  }

  return {
    contracts: {
      pairs,
      masterChefPools,
      masterChefPools2,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx: BaseContext,
  { pairs, masterChefPools, masterChefPools2 },
) => {
  const pairsBalances = await getPairsBalances(ctx, 'bsc', pairs || [])
  // New masterchef

  let masterChefBalances = await getMasterChefBalances(ctx, {
    masterChef,
    tokens: masterChefPools || [],
    rewardToken: cake,
    pendingRewardMethod: masterChefPendingRewardsMethod('pendingCake'),
  })

  masterChefBalances = await getUnderlyingBalances('bsc', masterChefBalances)

  // Old masterchef
  let masterChefBalances2 = await getMasterChefBalances(ctx, {
    masterChef: masterChef2,
    tokens: masterChefPools2 || [],
    rewardToken: cake,
    pendingRewardMethod: masterChefPendingRewardsMethod('pendingCake'),
  })

  masterChefBalances2 = await getUnderlyingBalances('bsc', masterChefBalances2)

  const balances = pairsBalances.concat(masterChefBalances).concat(masterChefBalances2)

  return {
    balances,
  }
}
