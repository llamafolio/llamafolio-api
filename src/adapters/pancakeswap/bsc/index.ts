import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefBalances, getMasterChefPoolsInfo } from '@lib/masterchef'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

import pancakeListsPairs from './pairs.json'

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
  address: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652', //legacy masterchef
}

const cake: Token = {
  chain: 'bsc',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'CAKE',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const pancakePairs = [...(pancakeListsPairs as Contract[])]

  const offset = props.pairOffset || 0
  const limit = 100

  const [/*pairs,*/ masterChefPoolsInfo, masterChefPoolsInfo2] = await Promise.all([
    // Comment since we are using hard fetch pairs from graphQL.
    // getPairsContracts({
    //   ctx,
    //   factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    //   offset,
    //   limit,
    // }),

    getMasterChefPoolsInfo(ctx, {
      masterChefAddress: masterChef.address,
    }),

    getMasterChefPoolsInfo(ctx, {
      masterChefAddress: masterChef2.address,
      methodName: 'lpToken', //lpToken address is in a different method from poolInfo
    }),
  ])

  // retrieve master chef pools details from lpToken addresses
  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pancakePairs) {
    pairByAddress[pair.address.toLowerCase()] = pair
  }
  const masterChefPools = masterChefPoolsInfo
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]
      if (!pair) {
        return null
      }
      const contract: Contract = { ...pair, pid: pool.pid, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  const masterChefPools2 = masterChefPoolsInfo2
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]
      if (!pair) {
        return null
      }
      const contract: Contract = { ...pair, pid: pool.pid, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  return {
    contracts: {
      pancakePairs,
      masterChefPools,
      masterChefPools2,
    },

    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

const masterChefBalances = async (ctx: BalancesContext, masterChefPools: Contract[], masterChefPools2: Contract[]) => {
  const [masterChefBalances, masterChefBalances2] = await Promise.all([
    getMasterChefBalances(ctx, {
      chain: 'bsc',
      masterChefAddress: masterChef.address,
      tokens: (masterChefPools || []) as Token[],
      rewardToken: cake,
      pendingRewardName: 'pendingCake',
    }),
    getMasterChefBalances(ctx, {
      chain: 'bsc',
      masterChefAddress: masterChef2.address,
      tokens: (masterChefPools2 || []) as Token[],
      rewardToken: cake,
      pendingRewardName: 'pendingCake',
    }),
  ])

  return Promise.all([getUnderlyingBalances(ctx, masterChefBalances), getUnderlyingBalances(ctx, masterChefBalances2)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const pancakeFarmBalances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pancakePairs: getPairsBalances,
    masterChefPools: (...args) => masterChefBalances(...args, contracts.masterChefPools2 || []),
  })

  return {
    balances: pancakeFarmBalances.map((res) => ({ ...res, category: res.category === 'farm' ? 'farm' : 'lp' })),
  }
}
