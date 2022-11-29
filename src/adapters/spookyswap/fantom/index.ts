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

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pairs, masterChefPools] = await Promise.all([
    getPairsContracts({
      chain: 'fantom',
      factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      offset,
      limit,
    }),
    getMasterChefPoolsInfo({
      masterChef,
    }),
  ])

  return {
    contracts: { pairs, masterChefPools },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
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
