import { Contract } from '@lib/adapter'
import { Chain, chainIdResolver } from '@lib/chains'
import request from 'graphql-request'

import {
  getChainsIndexedStateQuery,
  getContractsInteractionsQuery,
  getContractsQuery,
  getTokensHoldersQuery,
  getTransactionHistoryQuery,
} from './queries'
import { IIndexerContract, IIndexerTransaction } from './types'

export const indexer_graph = async (query: string, variables = {}, headers = {}) =>
  request('https://graph.llamafolio.com/v1/graphql', query, variables, headers)

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

export const getTokensHolders = async (
  token: string,
  chain: string,
  limit: number,
  offset: number,
  headers = {},
): Promise<{
  erc20_balances: { address: string; balance: string }[]
  erc20_balances_aggregate: { aggregate: { count: number; sum: { balance: number } } }
}> => {
  const { erc20_balances, erc20_balances_aggregate } = await indexer_graph(
    getTokensHoldersQuery(token.toLowerCase(), chain, limit, offset),
    {},
    headers,
  )

  return { erc20_balances, erc20_balances_aggregate }
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

/**
 * Return unique contracts used (transactions from) and unique tokens received by given address
 * @param params
 */
export const getContractsInteractions = async ({
  fromAddress,
  chain,
  adapterId,
  headers = {},
}: {
  fromAddress: string
  chain?: Chain
  adapterId?: string
  headers?: any
}) => {
  const contracts: Contract[] = []
  const erc20Transfers: Contract[] = []

  const { transactions, erc20_transfers } = await indexer_graph(
    getContractsInteractionsQuery({ fromAddress, chain, adapterId }),
    {},
    headers,
  )

  for (const transaction of transactions) {
    for (const contract of transaction.adapters_contracts) {
      contracts.push({
        ...contract.data,
        chain: (chainIdResolver[transaction.chain] || transaction.chain) as Chain,
        address: transaction.to_address,
        standard: contract.standard,
        name: contract.name,
        category: contract.category,
        adapterId: contract.adapter_id,
      })
    }
  }

  for (const transfer of erc20_transfers) {
    for (const contract of transfer.adapters_contracts) {
      // also consider token received as part of contracts
      contracts.push({
        ...contract.data,
        chain: (chainIdResolver[transfer.chain] || transfer.chain) as Chain,
        address: transfer.token,
        standard: contract.standard,
        name: contract.name,
        category: contract.category,
        adapterId: contract.adapter_id,
      })

      erc20Transfers.push({
        ...contract.data,
        chain: (chainIdResolver[transfer.chain] || transfer.chain) as Chain,
        address: transfer.token,
        standard: contract.standard,
        name: contract.name,
        category: contract.category,
        adapterId: contract.adapter_id,
      })
    }
  }

  return { contracts, erc20Transfers }
}
