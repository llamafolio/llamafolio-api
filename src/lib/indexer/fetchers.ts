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
): Promise<{ token_transfers: IndexerTokenInteraction[] }> =>
  indexer_graph(getTokensInteractedQuery(address.toLowerCase(), chain), variables, headers)

export const getContractsInteracted = async (
  address: string,
  variables = {},
  headers = {},
  chain?: string,
): Promise<{ contract_interactions: IndexerContractsInteracted[] }> =>
  indexer_graph(getContractsInteractedQuery(address.toLowerCase(), chain), variables, headers)

export const getTokenDetails = async (
  tokens: string[],
  variables = {},
  headers = {},
  chain?: string,
): Promise<{ tokens: IndexerContractsInteracted[] }> =>
  indexer_graph(getTokensDetailsQuery(tokens, chain), variables, headers)
