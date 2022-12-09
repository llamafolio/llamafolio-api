import { BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { gql, request } from 'graphql-request'

const THE_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/euler-xyz/euler-mainnet'

const marketsQuery = gql`
  {
    eulerMarketStore(id: "euler-market-store") {
      markets(first: 100) {
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

export async function getMarketsContracts(chain: Chain): Promise<Contract[]> {
  const contracts: Contract[] = []

  const {
    eulerMarketStore: { markets },
  } = await request(THE_GRAPH_URL, marketsQuery)

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    contracts.push(
      {
        chain,
        category: 'lend',
        address: markets[marketIdx].eTokenAddress,
        yieldKey: `${markets[marketIdx].eTokenAddress.toLowerCase()}-euler`,
        underlyings: [markets[marketIdx].address],
      },
      {
        chain,
        category: 'borrow',
        type: 'debt',
        address: markets[marketIdx].dTokenAddress,
        yieldKey: `${markets[marketIdx].dTokenAddress.toLowerCase()}-euler`,
        underlyings: [markets[marketIdx].address],
      },
    )
  }

  return contracts
}

export async function getHealthFactor(ctx: BalancesContext, chain: Chain, lensContract: Contract): Promise<number> {
  const getHealthFactor = await call({
    chain,
    target: lensContract.address,
    params: [ctx.address],
    abi: {
      inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
      name: 'getAccountStatus',
      outputs: [
        { internalType: 'uint256', name: 'collateralValue', type: 'uint256' },
        { internalType: 'uint256', name: 'liabilityValue', type: 'uint256' },
        { internalType: 'uint256', name: 'healthScore', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const healthFactor = getHealthFactor.output.healthScore / Math.pow(10, 18)

  return healthFactor
}
