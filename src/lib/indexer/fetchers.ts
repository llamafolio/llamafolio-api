import request from 'graphql-request'

import { getContractsInteractedQuery, getTokensDetailsQuery, getTokensInteractedQuery } from './queries'
import { IndexerContractsInteracted, IndexerTokenInteraction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://indexer.kindynos.mx/v1/graphql', query, variables, headers)

export const getTokensInteracted = async (
  address: string,
  variables = {},
  headers = {},
  chain?: string,
): Promise<IndexerTokenInteraction[]> => {
  const { token_transfers } = await indexer_graph(
    getTokensInteractedQuery(address.toLowerCase(), chain),
    variables,
    headers,
  )

  return token_transfers
}

export const getContractsInteracted = async (
  address: string,
  variables = {},
  headers = {},
  chain?: string,
): Promise<IndexerContractsInteracted[]> => {
  const { contract_interactions } = await indexer_graph(
    getContractsInteractedQuery(address.toLowerCase(), chain),
    variables,
    headers,
  )

  return contract_interactions
}

export const getTokenDetails = async (
  tokensAddress: string[],
  variables = {},
  headers = {},
  chain?: string,
): Promise<IndexerContractsInteracted[]> => {
  const { tokens } = await indexer_graph(getTokensDetailsQuery(tokensAddress, chain), variables, headers)

  return tokens
}
