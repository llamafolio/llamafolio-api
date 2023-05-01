import request from 'graphql-request'

import { getContractsQuery, getTransactionHistoryQuery } from './queries'
import { IIndexerContract, IIndexerTransaction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://graph.llamafolio.com/v1/graphql', query, variables, headers)

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

export const getContracts = async (
  contract: string,
  chain?: string,
  headers = {},
): Promise<{
  contracts: IIndexerContract[]
}> => {
  const { contracts } = await indexer_graph(getContractsQuery(contract, chain), {}, headers)

  return { contracts }
}
