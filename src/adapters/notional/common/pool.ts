import type { BaseContext, Contract } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import request, { gql } from 'graphql-request'

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/notional-finance/mainnet-v2'

export async function getNotionalPools(ctx: BaseContext): Promise<Contract[]> {
  const query = gql`
    query pools {
      nTokens {
        tokenAddress
        currency {
          tokenAddress
          underlyingTokenAddress
        }
      }
    }
  `

  const { nTokens }: any = await request(GRAPH_URL, query)

  return Promise.all(
    nTokens.map(async (token: any) => {
      const { tokenAddress, currency } = token
      const { tokenAddress: currencyTokenAddress, underlyingTokenAddress } = currency

      const underlyings = await getERC20Details(ctx, [
        underlyingTokenAddress ?? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      ])

      return {
        chain: ctx.chain,
        address: tokenAddress,
        token: currencyTokenAddress,
        underlyings,
      }
    }),
  )
}
