import { Adapter, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
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

const getContracts = async () => {
  const [pairs, masterChefPoolsInfo, masterChefPoolsInfo2] = await Promise.all([
    getPairsContracts({
      chain: 'bsc',
      factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      length: 4000,
    }),

    getMasterChefPoolsInfo({
      chain: 'bsc',
      masterChefAddress: masterChef.address,
    }),

    getMasterChefPoolsInfo({
      chain: 'bsc',
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
      return { ...pair, pid: pool.pid }
    })
    .filter(isNotNullish)

  const masterChefPools2 = masterChefPoolsInfo2
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]
      if (!pair) {
        return null
      }
      return { ...pair, pid: pool.pid }
    })
    .filter(isNotNullish)

  const contracts: Contract[] = [
    ...pairs.map((c) => Object.assign(c, { category: 'lp' })),
    ...masterChefPools.map((c) => Object.assign(c, { category: 'farm' })),
    ...masterChefPools2.map((c) => Object.assign(c, { category: 'farm2' })),
  ]

  return {
    contracts,
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts: Contract[]) => {
  const lp: Contract[] = []
  const farm: Contract[] = []
  const farmOld: Contract[] = []

  for (const contract of contracts) {
    if (contract.category === 'lp') {
      lp.push(contract)
    } else if (contract.category === 'farm') {
      farm.push(contract)
    } else if (contract.category === 'farm2') {
      farmOld.push(contract)
    }
  }

  const pairs = await getPairsBalances(ctx, 'bsc', lp)

  //new masterchef
  let masterChefBalances = await getMasterChefBalances(ctx, {
    chain: 'bsc',
    masterChefAddress: masterChef.address,
    tokens: farm as Token[],
    rewardToken: cake,
    pendingRewardName: 'pendingCake',
  })

  masterChefBalances = await getUnderlyingBalances('bsc', masterChefBalances)

  //old masterchef
  let masterChefBalances2 = await getMasterChefBalances(ctx, {
    chain: 'bsc',
    masterChefAddress: masterChef2.address,
    tokens: farmOld as Token[],
    rewardToken: cake,
    pendingRewardName: 'pendingCake',
  })

  masterChefBalances2 = await getUnderlyingBalances('bsc', masterChefBalances2)

  const balances = pairs.concat(masterChefBalances).concat(masterChefBalances2)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'pancakeswap',
  getContracts,
  getBalances,
}

export default adapter
