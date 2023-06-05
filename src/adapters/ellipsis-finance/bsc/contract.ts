import type { BaseContext, Contract } from '@lib/adapter'

const API_URL = 'https://api.ellipsis.finance/api/getPoolsCrypto'

export async function getEllipsisContracts(ctx: BaseContext): Promise<Contract[]> {
  const response = await fetch(API_URL)
  const res: any = await response.json()

  return res.data.allPools.map((d: any) => ({
    chain: ctx.chain,
    name: d.name,
    address: d.lpToken.address,
    lpToken: d.lpToken.address,
    symbol: d.lpToken.symbol,
    decimals: d.lpToken.decimals,
    pool: d.address,
    pid: d.poolIndex,
    tokens: d.tokens,
    underlyings: d.underlying,
  }))
}
