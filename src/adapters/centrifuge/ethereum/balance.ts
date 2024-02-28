import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { isNotNullish } from '@lib/type'
import request, { gql } from 'graphql-request'

export async function getCentrifugeBalances(ctx: BalancesContext, DAI: Contract): Promise<Balance[]> {
  const GRAPH_URL = 'https://api.goldsky.com/api/public/project_clhi43ef5g4rw49zwftsvd2ks/subgraphs/main/prod/gn'

  const query = gql`
    query tokenBalances($address: String!) {
      tokenBalances(where: { owner_: { id: $address } }) {
        token {
          symbol
          id
        }
        balanceValue
        totalAmount
      }
    }
  `
  const { tokenBalances }: any = await request(GRAPH_URL, query, { address: ctx.address })

  return tokenBalances
    .map((tokenBalance: any) => {
      const { token, balanceValue, totalAmount } = tokenBalance
      const { symbol, id } = token

      if (balanceValue === 0n || totalAmount === 0n) return null

      return {
        chain: ctx.chain,
        address: id,
        symbol: symbol,
        decimals: 18,
        amount: BigInt(totalAmount),
        underlyings: [{ ...DAI, amount: BigInt(balanceValue) }],
        rewards: undefined,
        category: 'farm',
      }
    })
    .filter(isNotNullish)
}
