import request from 'graphql-request'

import { getContractsInteractedQuery, getTokensInteractedQuery, getTransactionHistoryQuery } from './queries'
import { IndexerContractsInteracted, IndexerTokenInteraction, IndexerTransaction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://indexer.kindynos.mx/v1/graphql', query, variables, headers)

export const getTransactionHistory = async (
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
  variables = {},
  headers = {},
): Promise<{ txs: IndexerTransaction[]; txs_aggregate: { aggregate: { count: number } } }> =>
  indexer_graph(
    getTransactionHistoryQuery(address.toLowerCase(), limit, offset, chainsFilter, protocolsFilter),
    variables,
    headers,
  )

export const getTokensInteracted = async (
  address: string,
  variables = {},
  headers = {},
): Promise<{ token_transfers: IndexerTokenInteraction[] }> =>
  indexer_graph(getTokensInteractedQuery(address.toLowerCase()), variables, headers)

export const getContractsInteracted = async (
  address: string,
  variables = {},
  headers = {},
): Promise<{ contract_interactions: IndexerContractsInteracted[] }> =>
  indexer_graph(getContractsInteractedQuery(address.toLowerCase()), variables, headers)
