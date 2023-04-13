import { BaseContext, Contract } from '@lib/adapter'
import fetch from 'node-fetch'

export async function getPoolContractsFromAPI(ctx: BaseContext, API_URL: string): Promise<Contract[]> {
  const response = await fetch(API_URL)
  const datas = await response.json()

  return Object.entries(datas).map(([address, data]: any) => ({
    chain: ctx.chain,
    address,
    pool: data.poolAddress,
    underlyings: [data.token0, data.token1],
  }))
}
