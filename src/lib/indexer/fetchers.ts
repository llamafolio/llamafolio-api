import request from 'graphql-request'

import { getTransactionHistoryQuery } from './queries'
import { IIndexerTransaction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://graph.kindynos.mx/v1/graphql', query, variables, headers)

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
  const query = getTransactionHistoryQuery(address.toLowerCase(), limit, offset, chainsFilter, protocolsFilter)

  const { transactions, transactions_aggregate } = await indexer_graph(query, {}, headers)

  return { transactions, transactions_aggregate }
}
