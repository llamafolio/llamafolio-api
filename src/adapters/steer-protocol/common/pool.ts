import type { BaseContext, Contract } from '@lib/adapter'
import { isNotNullish } from '@lib/type'
import request, { gql } from 'graphql-request'

export async function getSteerPools(ctx: BaseContext, graph: string): Promise<Contract[]> {
  const query = gql`
    query vaults {
      vaults(first: 1000) {
        id
        token0
        token0Symbol
        token1
        token1Symbol
      }
    }
  `
  const { vaults }: any = await request(graph, query)

  return vaults
    .map((vault: any) => {
      const { id: address, token0, token1 } = vault
      if (!token0 || !token1) return null
      const underlyings = [token0, token1]

      return { chain: ctx.chain, address, underlyings }
    })
    .filter(isNotNullish)
}
