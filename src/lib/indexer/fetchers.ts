import request from 'graphql-request'

import { getTransactionHistoryQuery } from './queries'
import { IndexerTransaction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://indexer.kindynos.mx/v1/graphql', query, variables, headers)

export const getTransactionHistory = async (
  address: string,
  limit: number,
  offset: number,
  variables = {},
  headers = {},
): Promise<{ txs: IndexerTransaction[] }> => {
  return await indexer_graph(getTransactionHistoryQuery(address.toLowerCase(), limit, offset), variables, headers)
}
