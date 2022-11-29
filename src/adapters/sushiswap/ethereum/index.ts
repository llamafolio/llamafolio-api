import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
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

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pairs, masterChefPoolsInfo] = await Promise.all([
    getPairsContracts({
      chain: 'ethereum',
      factoryAddress: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
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
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx: BaseContext,
  { pairs, masterChefPools },
) => {
  const pairsBalances = await getPairsBalances(ctx, 'ethereum', pairs || [])

  let masterChefBalances = await getMasterChefBalances(ctx, {
    chain: 'ethereum',
    masterChefAddress: masterChef.address,
    tokens: (masterChefPools || []) as Token[],
    rewardToken: sushi,
    pendingRewardName: 'pendingSushi',
  })

  masterChefBalances = await getUnderlyingBalances('ethereum', masterChefBalances)

  const balances = pairsBalances.concat(masterChefBalances)

  return {
    balances,
  }
}
