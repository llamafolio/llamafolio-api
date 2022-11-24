import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getMasterChefBalances, getMasterChefPoolsInfo } from '@lib/masterchef'
import { Token } from '@lib/token'
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

export const getContracts = async () => {
  const [pairs, masterChefPools] = await Promise.all([
    getPairsContracts({
      chain: 'ethereum',
      factoryAddress: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx: BaseContext,
  { pairs, masterChefPools },
) => {
  const pairsBalances = await getPairsBalances(ctx, 'ethereum', pairs || [])

  let masterChefBalances = await getMasterChefBalances(ctx, {
    masterChef,
    tokens: (masterChefPools || []) as Token[],
    rewardToken: sushi,
  })

  masterChefBalances = await getUnderlyingBalances('ethereum', masterChefBalances)

  const balances = pairsBalances.concat(masterChefBalances)

  return {
    balances,
  }
}
