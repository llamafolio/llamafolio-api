import { getBalancerPools } from '@adapters/balancer/common/pool'
import type { BaseContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'

export async function getStakeDaoContractsFromAPIs(ctx: BaseContext, urls: string[]): Promise<Contract[]> {
  const pools: { [key: string]: any }[] = []

  for (const url of urls) {
    const API = `https://lockers.stakedao.org/api/strategies/cache/${url}`
    const response = await fetch(API)
    const data: any[] = await response.json()
    pools.push(...data.map((pool) => ({ ...pool, provider: url })))
  }

  return pools.map((contract) => {
    const { name, token, tokenReceipt, underlyingTokens, underlyingToken, rewards, infos } = contract
    const pool = infos.factoryPoolUnderlying ? infos.factoryPoolUnderlying : infos.factoryPool
    const underlyings = underlyingTokens ? mapTokens(ctx, underlyingTokens) : mapTokens(ctx, [underlyingToken])
    const rewardsTokens = mapTokens(ctx, rewards)

    return {
      chain: ctx.chain,
      name,
      address: infos.sdtLiquidityGauge,
      token: token.address,
      decimals: tokenReceipt.decimals,
      symbol: tokenReceipt.symbol,
      underlyings,
      rewards: rewardsTokens,
      pool,
      infos,
      provider: contract.provider,
    }
  })
}

export async function getStakeDaoOldContractsFromApi(ctx: BaseContext): Promise<Contract[]> {
  const API = `https://lockers.stakedao.org/api/lockers/cache`
  const response = await fetch(API)
  const datas: any[] = await response.json()

  return datas.map((data) => {
    const { name, token, tokenReceipt, rewardTokens, infos } = data
    const rewards = mapTokens(ctx, rewardTokens)

    return {
      chain: ctx.chain,
      name,
      address: infos.gauge,
      token: token.address,
      decimals: tokenReceipt.decimals,
      symbol: tokenReceipt.symbol,
      underlyings: [infos.token],
      rewards,
      infos,
    }
  })
}

export async function getDetailedBalancerPools(ctx: BaseContext, pools: Contract[], url: string, controller: Contract) {
  const balancerPools = await getBalancerPools(ctx, url, controller)

  pools.forEach((pool) => {
    const { underlyings } = pool
    if (underlyings) {
      underlyings.forEach((underlying, index) => {
        const matchingPool = balancerPools.find(
          (balancerPool) => balancerPool.address === (underlying as Contract).address,
        )
        if (matchingPool) {
          // Replace pool underlying with matching balancerPool
          underlyings[index] = matchingPool
        }
      })
    }
  })

  return pools
}

const mapTokens = (ctx: BaseContext, tokens: Contract[]) => {
  return tokens.map((token) => {
    // replace alias ETH
    const address = token.address.length < 1 ? ADDRESS_ZERO : token.address
    return {
      chain: ctx.chain,
      address,
      symbol: token.symbol,
      decimals: token.decimals,
    }
  })
}
