import { BaseContext, Contract } from '@lib/adapter'
import fetch from 'node-fetch'

export async function getPoolContractsFromAPI(ctx: BaseContext, API_URLs: string[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  for (const API_URL of API_URLs) {
    const response = await fetch(API_URL)
    const datas = await response.json()

    contracts.push(
      ...Object.entries(datas).map(([address, data]: any) => ({
        chain: ctx.chain,
        address,
        pool: data.poolAddress,
        underlyings: [data.token0, data.token1],
      })),
    )
  }

  return contracts
}
