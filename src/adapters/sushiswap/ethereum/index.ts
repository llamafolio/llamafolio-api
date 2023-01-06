import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefBalances, getMasterChefPoolsInfo } from '@lib/masterchef'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getMeowshiYieldBalance, getXSushiStakeBalance } from '../common/balances'

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'ethereum',
  address: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd',
}

const sushi: Token = {
  chain: 'ethereum',
  address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
  symbol: 'SUSHI',
  decimals: 18,
}

const xSushi: Contract = {
  chain: 'ethereum',
  address: '0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272',
  decimals: 18,
  symbol: 'xSUSHI',
}

const meowshi: Contract = {
  chain: 'ethereum',
  address: '0x650F44eD6F1FE0E1417cb4b3115d52494B4D9b6D',
  decimals: 18,
  symbol: 'MEOW',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pairs, masterChefPoolsInfo] = await Promise.all([
    getPairsContracts({
      ctx,
      factoryAddress: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
      offset,
      limit,
    }),

    getMasterChefPoolsInfo(ctx, {
      masterChefAddress: masterChef.address,
    }),
  ])

  // retrieve master chef pools details from lpToken addresses
  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairs) {
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

  return {
    contracts: {
      pairs,
      masterChefPools,
      xSushi,
      meowshi,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

function getSushiSwapBalances(ctx: BalancesContext, pairs: Contract[], masterChefPools: Contract[]) {
  return Promise.all([
    getPairsBalances(ctx, pairs || []),
    getMasterChefBalances(ctx, {
      chain: 'ethereum',
      masterChefAddress: masterChef.address,
      tokens: (masterChefPools || []) as Token[],
      rewardToken: sushi,
      pendingRewardName: 'pendingSushi',
    }),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xSushi: getXSushiStakeBalance,
    meowshi: getMeowshiYieldBalance,
    pairs: (...args) => getSushiSwapBalances(...args, contracts.masterChefPools || []),
  })

  return {
    balances,
  }
}
