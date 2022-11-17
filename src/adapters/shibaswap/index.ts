import { Adapter, Balance, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { Category } from '@lib/category'
import { getMasterChefBalances, getMasterChefPoolsInfo } from '@lib/masterchef'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

import { getLockerBalances, getStakerBalances } from './balances'

const locker: Contract = {
  name: 'locker',
  displayName: 'Locker',
  chain: 'ethereum',
  address: '0xa404f66b9278c4ab8428225014266b4b239bcdc7',
}
const staker: Contract = {
  name: 'staker',
  displayName: 'Staker tBone',
  chain: 'ethereum',
  address: '0xf7a0383750fef5abace57cc4c9ff98e3790202b3',
}

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'ethereum',
  address: '0x94235659cf8b805b2c658f9ea2d6d6ddbb17c8d7',
}

const bone: Token = {
  chain: 'ethereum',
  symbol: 'BONE',
  decimals: 18,
  address: '0x9813037ee2218799597d83d4a5b6f3b6778218d9',
}

const getContracts = async () => {
  const [pairsInfo, masterChefPoolsInfo] = await Promise.all([
    getPairsContracts({
      chain: 'ethereum',
      factoryAddress: '0x115934131916C8b277DD010Ee02de363c09d037c',
      length: 100,
    }),

    getMasterChefPoolsInfo({
      chain: 'ethereum',
      masterChefAddress: masterChef.address,
    }),
  ])

  // retrieve master chef pools details from lpToken addresses
  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairsInfo) {
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

  const contracts: Contract[] = [
    ...pairsInfo.map((c) => ({ ...c, category: 'lp' as Category })),
    ...masterChefPools.map((c) => ({ ...c, category: 'farm' as Category })),
  ]

  return {
    contracts,
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts: Contract[]) => {
  let balances: Balance[] = []
  const lp: Contract[] = []
  const farm: Contract[] = []

  for (const contract of contracts) {
    if (contract.category === 'lp') {
      lp.push(contract)
    } else if (contract.category === 'farm') {
      farm.push(contract)
    }
  }

  const stakerBalances = await getStakerBalances(ctx, 'ethereum', staker.address)

  balances = balances.concat(stakerBalances)

  const lockerBalances = await getLockerBalances(ctx, 'ethereum', locker.address)

  balances = balances.concat(lockerBalances)

  const pairs = await getPairsBalances(ctx, 'ethereum', lp)

  balances = balances.concat(pairs)

  let masterChefBalances = await getMasterChefBalances(ctx, {
    chain: 'ethereum',
    masterChefAddress: masterChef.address,
    tokens: farm as Token[],
    rewardToken: bone,
    pendingRewardName: 'pendingToken',
  })

  masterChefBalances = await getUnderlyingBalances('ethereum', masterChefBalances)

  balances = balances.concat(masterChefBalances)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'shibaswap',
  getContracts,
  getBalances,
}

export default adapter
