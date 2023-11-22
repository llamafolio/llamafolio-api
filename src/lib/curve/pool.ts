import type { BaseContext, Contract } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { getCurveRegistriesIds } from '@lib/curve/registries'

interface Coin {
  address: `0x${string}`
  symbol: string
  decimals: number
  isBasePoolLpToken?: boolean
}

interface Reward {
  tokenAddress: `0x${string}`
  decimals: number
  symbol: string
}

interface PoolData {
  address: `0x${string}`
  lpTokenAddress: `0x${string}`
  coins: Coin[]
  gaugeAddress: `0x${string}`
  gaugeRewards: Reward[]
  isMetaPool: boolean
  underlyingCoins: Coin[]
  isBroken: boolean
}

const chainId = (chain: Chain) => (chain === 'gnosis' ? 'xdai' : chain)

export async function getCurvePools(ctx: BaseContext): Promise<Contract[]> {
  const registries: string[] = await getCurveRegistriesIds(ctx)
  const poolsData: any[] = await fetchPoolsData(ctx, registries)
  return processPoolsData(ctx, poolsData)
}

async function fetchPoolsData(ctx: BaseContext, registries: string[]): Promise<any[]> {
  const urls: string[] = registries.map(
    (registry) => `https://api.curve.fi/api/getPools/${chainId(ctx.chain)}/${registry}`,
  )

  const requests: Promise<any>[] = urls.map((url) => fetch(url).then((res) => res.json()))

  return Promise.all(requests)
}

function processPoolsData(ctx: BaseContext, allDatas: any[]): Contract[] {
  const poolContracts: Contract[] = allDatas.flatMap(({ data: { poolData } }) =>
    poolData.map((pool: PoolData) => createContractFromPoolData(ctx, pool)),
  )

  return uniqueNonBrokenContracts(poolContracts)
}

function createContractFromPoolData(ctx: BaseContext, pool: PoolData): Contract {
  const { address, lpTokenAddress, coins, gaugeAddress, gaugeRewards, isMetaPool, underlyingCoins, isBroken } = pool

  return {
    chain: ctx.chain,
    address: lpTokenAddress,
    token: lpTokenAddress,
    gauge: gaugeAddress,
    pool: address,
    underlyings: processCoins(ctx, isMetaPool ? underlyingCoins : coins, isMetaPool),
    rewards: (gaugeRewards || []).map((reward) => processReward(ctx, reward)),
    isBroken,
  }
}

function processCoins(ctx: BaseContext, coins: Coin[], isMetaPool: boolean): Contract[] {
  return coins.map((coin) => (isMetaPool ? processUnderlyingCoin(ctx, coin) : processCoin(ctx, coin)))
}

function processUnderlyingCoin(ctx: BaseContext, coin: Coin): Contract {
  const { address: underlyingAddress, symbol, decimals, isBasePoolLpToken } = coin
  return {
    chain: ctx.chain,
    address: underlyingAddress,
    symbol,
    decimals,
    isBasePoolLpToken,
  }
}

function processCoin(ctx: BaseContext, coin: Coin): Contract {
  const { address, symbol, decimals } = coin
  return {
    chain: ctx.chain,
    address,
    symbol,
    decimals,
  }
}

function processReward(ctx: BaseContext, reward: Reward): Contract {
  const { tokenAddress, decimals, symbol } = reward
  return {
    chain: ctx.chain,
    address: tokenAddress,
    decimals,
    symbol,
  }
}

function uniqueNonBrokenContracts(contracts: Contract[]): Contract[] {
  const uniqueContracts = new Map<string, Contract>(
    contracts.filter((contract) => !contract.isBroken).map((contract) => [contract.address, contract]),
  )

  return Array.from(uniqueContracts.values())
}
