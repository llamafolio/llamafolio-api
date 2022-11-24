import { Contract, GetBalancesHandler } from '@lib/adapter'
import { getMasterChefBalances, getMasterChefPoolsInfo, masterChefPendingRewardsMethod } from '@lib/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'fantom',
  address: '0x2b2929E785374c651a81A63878Ab22742656DcDd',
}

const boo: Token = {
  chain: 'fantom',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'BOO',
  decimals: 18,
}

export const getContracts = async () => {
  const [pairs, masterChefPools] = await Promise.all([
    getPairsContracts({
      chain: 'fantom',
      factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
      length: 100,
    }),
    getMasterChefPoolsInfo({
      masterChef,
    }),
  ])

  return {
    contracts: { pairs, masterChefPools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pairs, masterChefPools }) => {
  const [pairBalances, masterChefBalances] = await Promise.all([
    getPairsBalances(ctx, 'fantom', pairs || []),
    getMasterChefBalances(ctx, {
      masterChef,
      tokens: masterChefPools || [],
      rewardToken: boo,
      pendingRewardMethod: masterChefPendingRewardsMethod('pendingBOO'),
    }),
  ])

  const masterChefBalancesUnderlying = await getUnderlyingBalances(masterChef.chain, masterChefBalances)

  const balances = masterChefBalancesUnderlying.concat(pairBalances)

  return {
    balances: balances,
  }
}
