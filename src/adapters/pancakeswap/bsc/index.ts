import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getMasterChefBalances, getMasterChefPoolsInfo } from '@lib/masterchef'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
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
  address: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652', //legacy masterchef
}

const cake: Token = {
  chain: 'bsc',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'CAKE',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pairs, masterChefPoolsInfo, masterChefPoolsInfo2] = await Promise.all([
    getPairsContracts({
      ctx,
      factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      offset,
      limit,
    }),

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
      pairs,
      masterChefPools,
      masterChefPools2,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx: BalancesContext,
  { pairs, masterChefPools, masterChefPools2 },
) => {
  const pairsBalances = await getPairsBalances(ctx, pairs || [])

  //new masterchef
  let masterChefBalances = await getMasterChefBalances(ctx, {
    chain: 'bsc',
    masterChefAddress: masterChef.address,
    tokens: (masterChefPools || []) as Token[],
    rewardToken: cake,
    pendingRewardName: 'pendingCake',
  })

  masterChefBalances = await getUnderlyingBalances(ctx, masterChefBalances)

  //old masterchef
  let masterChefBalances2 = await getMasterChefBalances(ctx, {
    chain: 'bsc',
    masterChefAddress: masterChef2.address,
    tokens: (masterChefPools2 || []) as Token[],
    rewardToken: cake,
    pendingRewardName: 'pendingCake',
  })

  masterChefBalances2 = await getUnderlyingBalances(ctx, masterChefBalances2)

  const balances = pairsBalances.concat(masterChefBalances).concat(masterChefBalances2)

  return {
    balances,
  }
}
