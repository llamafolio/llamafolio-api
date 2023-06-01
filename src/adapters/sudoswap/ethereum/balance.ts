import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Token } from '@lib/token'
import request, { gql } from 'graphql-request'

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function fetchPairsBalances(
  ctx: BalancesContext,
  _pairs: Contract[],
  graphQl: string,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const query = gql`
    query FetchPairsBalances($owner: String!) {
      pairs(first: 1000, where: { owner: $owner }) {
        id
        ethBalance
      }
    }
  `

  const variables = {
    owner: ctx.address,
  }

  const res: any = await request(graphQl, query, variables)

  for (const pair of res.pairs) {
    if (!pair.id || !pair.ethBalance || pair.ethBalance === 0) {
      continue
    }

    balances.push({
      chain: ctx.chain,
      decimals: WETH.decimals,
      symbol: WETH.symbol,
      address: pair.id,
      amount: BigInt(pair.ethBalance),
      underlyings: [WETH],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
