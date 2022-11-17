import { Adapter, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getMasterChefBalances, getMasterChefPoolsInfo } from '@lib/masterchef'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

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

const getContracts = async () => {
  const [pairs, masterChefPoolsInfo] = await Promise.all([
    getPairsContracts({
      chain: 'ethereum',
      factoryAddress: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
      length: 100,
    }),

    getMasterChefPoolsInfo({
      chain: 'ethereum',
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
      return { ...pair, pid: pool.pid }
    })
    .filter(isNotNullish)

  const contracts = [
    ...pairs.map((c) => Object.assign(c, { category: 'lp' })),
    ...masterChefPools.map((c) => Object.assign(c, { category: 'farm' })),
  ]

  return {
    contracts,
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts: Contract[]) => {
  const lp: Contract[] = []
  const farm: Contract[] = []

  for (const contract of contracts) {
    if (contract.category === 'lp') {
      lp.push(contract)
    } else if (contract.category === 'farm') {
      farm.push(contract)
    }
  }

  const pairs = await getPairsBalances(ctx, 'ethereum', lp)

  let masterChefBalances = await getMasterChefBalances(ctx, {
    chain: 'ethereum',
    masterChefAddress: masterChef.address,
    tokens: farm as Token[],
    rewardToken: sushi,
    pendingRewardName: 'pendingSushi',
  })

  masterChefBalances = await getUnderlyingBalances('ethereum', masterChefBalances)

  const balances = pairs.concat(masterChefBalances)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'sushiswap',
  getContracts,
  getBalances,
}

export default adapter
