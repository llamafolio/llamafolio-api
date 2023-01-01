import { Balance, BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
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

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pairsInfo, masterChefPoolsInfo] = await Promise.all([
    getPairsContracts({
      chain: 'ethereum',
      factoryAddress: '0x115934131916C8b277DD010Ee02de363c09d037c',
      offset,
      limit,
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
      const contract: Contract = { ...pair, pid: pool.pid, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  return {
    contracts: {
      pairs: pairsInfo,
      masterChefPools,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx: BalancesContext,
  { pairs, masterChefPools },
) => {
  let balances: Balance[] = []

  const stakerBalances = await getStakerBalances(ctx, staker.address)

  balances = balances.concat(stakerBalances)

  const lockerBalances = await getLockerBalances(ctx, locker.address)

  balances = balances.concat(lockerBalances)

  const pairsBalances = await getPairsBalances(ctx, pairs || [])

  balances = balances.concat(pairsBalances)

  let masterChefBalances = await getMasterChefBalances(ctx, {
    chain: 'ethereum',
    masterChefAddress: masterChef.address,
    tokens: (masterChefPools || []) as Token[],
    rewardToken: bone,
    pendingRewardName: 'pendingToken',
  })

  masterChefBalances = await getUnderlyingBalances('ethereum', masterChefBalances)

  balances = balances.concat(masterChefBalances)

  return {
    balances,
  }
}
