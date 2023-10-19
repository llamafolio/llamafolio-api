import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import request, { gql } from 'graphql-request'

const chains: { [key: string]: string } = {
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  polygon: 'polygon',
  bsc: 'bnb',
  ethereum: 'ethereum',
}

export async function getMeanFinanceBalances(ctx: BalancesContext, manager: Contract): Promise<Balance[] | undefined> {
  const balances: Balance[] = []
  const THE_GRAPH_URL = `https://api.thegraph.com/subgraphs/name/mean-finance/dca-v2-yf-${chains[ctx.chain]}`

  const query = gql`
    query GetPositions($userAddress: String!) {
      positions(where: { user: $userAddress }) {
        id
        status
        remainingLiquidity
        toWithdrawUnderlyingAccum
        from {
          id
          symbol
          decimals
          underlyingTokens {
            id
            symbol
            decimals
          }
        }
        to {
          id
          symbol
          decimals
          underlyingTokens {
            id
            symbol
            decimals
          }
        }
      }
    }
  `

  const { positions }: any = await request(THE_GRAPH_URL, query, { userAddress: ctx.address })

  if (!positions) return

  for (const position of positions) {
    const { id, remainingLiquidity, toWithdrawUnderlyingAccum, from, to, status } = position

    if (status === 'COMPLETED' || status === 'TERMINATED') continue

    const underlying0 = createUnderlying(ctx, from, remainingLiquidity)
    const underlying1 = createUnderlying(ctx, to, toWithdrawUnderlyingAccum)

    balances.push({
      chain: ctx.chain,
      address: manager.address,
      amount: 1n,
      decimals: 1,
      symbol: `#${id}`,
      underlyings: [underlying0, underlying1],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

function createUnderlying(ctx: BalancesContext, asset: any, amount: number) {
  const underlyingToken = asset.underlyingTokens[0]
  return {
    chain: ctx.chain,
    address: underlyingToken ? underlyingToken.id : asset.id,
    decimals: underlyingToken ? underlyingToken.decimals : asset.decimals,
    symbol: underlyingToken ? underlyingToken.symbol : asset.symbol,
    amount: BigInt(amount),
  }
}
