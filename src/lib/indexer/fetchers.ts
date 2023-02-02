import request from 'graphql-request'

import { getChainsIndexedStateQuery, getTransactionHistoryQuery } from './queries'
import { IIndexerTransaction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://graph.kindynos.mx/v1/graphql', query, variables, headers)

export const getChainBlocks = async (headers = {}): Promise<{ chain: string; indexed_blocks_amount: number }[]> => {
  const { chains_indexed_state } = await indexer_graph(getChainsIndexedStateQuery(), {}, headers)

  return chains_indexed_state
}

export const getTransactionHistory = async (
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
  headers = {},
): Promise<{
  transactions: IIndexerTransaction[]
  transactions_aggregate: { aggregate: { count: number } }
}> => {
  const { transactions, transactions_aggregate } = await indexer_graph(
    getTransactionHistoryQuery(address.toLowerCase(), limit, offset, chainsFilter, protocolsFilter),
    {},
    headers,
  )

  return { transactions, transactions_aggregate }
}
