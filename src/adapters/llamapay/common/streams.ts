import type { Balance, BalancesContext } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import { gql, request } from 'graphql-request'

const abi = {
  withdrawable: {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint216', name: 'amountPerSec', type: 'uint216' },
    ],
    name: 'withdrawable',
    outputs: [
      { internalType: 'uint256', name: 'withdrawableAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUpdate', type: 'uint256' },
      { internalType: 'uint256', name: 'owed', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const endpoints: Partial<Record<Chain, string>> = {
  arbitrum: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-arbitrum',
  avalanche: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-avalanche-mainnet',
  bsc: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-bsc',
  fantom: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-fantom',
  ethereum: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-mainnet',
  optimism: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-optimism',
  polygon: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-polygon',
  gnosis: 'https://api.thegraph.com/subgraphs/name/nemusonaneko/llamapay-xdai',
}

const payeeStreamsQuery = gql`
  query PayeeStreams($id: String!) {
    streams(orderBy: createdTimestamp, orderDirection: desc, where: { payee: $id }) {
      streamId
      active
      amountPerSec
      createdTimestamp
      paused
      pausedAmount
      contract {
        address
      }
      payer {
        id
      }
      token {
        symbol
        address
        decimals
      }
    }
  }
`

export async function getPayeeStreams(ctx: BalancesContext) {
  const endpoint = endpoints[ctx.chain]
  if (!endpoint) {
    return []
  }

  const balances: Balance[] = []

  const { streams } = await request(endpoint, payeeStreamsQuery, { id: ctx.address.toLowerCase() })

  const withdrawablesRes = await multicall({
    ctx,
    calls: streams.map((stream: any) => ({
      target: stream.contract.address,
      params: [stream.payer.id, ctx.address, stream.amountPerSec],
    })),
    abi: abi.withdrawable,
  })

  for (let streamIdx = 0; streamIdx < streams.length; streamIdx++) {
    const stream = streams[streamIdx]
    const withdrawableRes = withdrawablesRes[streamIdx]
    if (!isSuccess(withdrawableRes)) {
      continue
    }

    balances.push({
      chain: ctx.chain,
      address: stream.token.address,
      symbol: stream.token.symbol,
      decimals: stream.token.decimals,
      amount: BigNumber.from(withdrawableRes.output.withdrawableAmount),
      category: 'reward',
    })
  }

  return balances
}
