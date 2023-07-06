import type { BaseContext, Contract } from '@lib/adapter'

export async function getStakeDaoContractsFromAPIs(ctx: BaseContext, urls: string[]): Promise<Contract[]> {
  const pools: any[] = []

  for (const url of urls) {
    const API = `https://lockers.stakedao.org/api/strategies/cache/${url}`
    const response = await fetch(API)
    const data: any[] = await response.json()
    pools.push(...data)
  }

  return pools.map((pool) => {
    const { name, tokenReceipt, underlyingTokens, underlyingToken, rewards, infos } = pool

    const underlyings = underlyingTokens ? mapTokens(ctx, underlyingTokens) : mapTokens(ctx, [underlyingToken])
    const rewardsTokens = mapTokens(ctx, rewards)

    return {
      chain: ctx.chain,
      name: name,
      address: tokenReceipt.address,
      decimals: tokenReceipt.decimals,
      symbol: tokenReceipt.symbol,
      underlyings,
      rewards: rewardsTokens,
      infos: infos,
    }
  })
}

const mapTokens = (ctx: BaseContext, tokens: any[]) => {
  return tokens.map((token) => ({
    chain: ctx.chain,
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
  }))
}
