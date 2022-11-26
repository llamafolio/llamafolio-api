import { Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { resolveERC20Details } from '@lib/erc20'
import { Token } from '@lib/token'
import { gql, request } from 'graphql-request'

const THE_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/euler-xyz/euler-mainnet'

const marketsQuery = gql`
  {
    eulerMarketStore(id: "euler-market-store") {
      markets {
        address: id
        name
        symbol
        decimals
        dTokenAddress
        eTokenAddress
        pTokenAddress
      }
    }
  }
`

export async function getMarketsContracts(chain: Chain) {
  const contracts: Contract[] = []

  const {
    eulerMarketStore: { markets },
  } = await request(THE_GRAPH_URL, marketsQuery)

  const { eTokens, dTokens } = await resolveERC20Details(chain, {
    eTokens: markets.map((market: any) => market.eTokenAddress),
    dTokens: markets.map((market: any) => market.dTokenAddress),
  })

  for (let i = 0; i < markets.length; i++) {
    const marketToken: Token = {
      chain,
      address: markets[i].address,
      symbol: markets[i].symbol,
      decimals: markets[i].decimals,
    }

    // lend
    if (eTokens[i].success) {
      const lendToken = eTokens[i].output!

      contracts.push({
        chain,
        category: 'lend',
        symbol: lendToken.symbol,
        decimals: lendToken.decimals,
        address: lendToken.address,
        yieldKey: `${lendToken.address.toLowerCase()}-euler`,
        underlyings: [marketToken],
      })
    }

    // borrow
    if (dTokens[i].success) {
      const borrowToken = dTokens[i].output!

      contracts.push({
        chain,
        category: 'borrow',
        type: 'debt',
        symbol: borrowToken.symbol,
        decimals: borrowToken.decimals,
        address: borrowToken.address,
        yieldKey: `${borrowToken.address.toLowerCase()}-euler`,
        underlyings: [marketToken],
      })
    }
  }

  return contracts
}
