import { gql } from 'graphql-request'

export const getChainsIndexedStateQuery = (): string => gql`
  query getChainsIndexedState @cached(refresh: true) {
    chains_indexed_state(order_by: { chain: asc }) {
      chain
      indexed_blocks_amount
    }
  }
`

export const getTransactionHistoryQuery = (
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
): string => {
  const filters = [
    ...chainsFilter.map((chain) => `{ chain: { _eq: "${chain}" } }`),
    ...protocolsFilter.map(
      (protocol) => `{ contract_interacted: { adapter: { adapter_id: { _eq: "${protocol}" } } } }`,
    ),
  ]

  const filtersParams = filters.length > 0 ? `{ _or: [${filters}] }` : ''

  return gql`
        query getTransactionHistory {
          transactions(
            where: {
              _and: [
                { from_address: { _eq: "${address}" } }
                ${filtersParams}
              ]
            }
            limit: ${limit}
            offset: ${offset}
            order_by: { timestamp: desc }
          ) {
            adapters_contracts {
              adapter_id
            }
            block_number
            chain
            from_address
            gas_price
            gas
            hash
            method_name {
              name
            }
            receipt {
              status
            }
            timestamp
            to_address
            erc20_transfers_aggregate(order_by: { log_index: asc }) {
              nodes {
                from_address
                to_address
                log_index
                token
                value
                token_details {
                  decimals
                  name
                  symbol
                }
              }
            }
            value
          }
          transactions_aggregate(
            where: {
              _and: [
                { from_address: { _eq: "${address}" } }
                ${filtersParams}
              ]
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `
}

export const getTokensHoldersQuery = (token: string, chain: string, limit: number, offset: number): string => gql`
  query getTokensBalances {
    erc20_balances(
      where: { token: { _eq: "${token}" }, chain: { _eq: "${chain}" } }
      limit: ${limit}
      offset: ${offset}
      order_by: { balance: desc }
    ) {
      balance
      address
    }
    erc20_balances_aggregate(
      where: {
        token: { _eq: "${token}" }
        chain: { _eq: "${chain}" }
        balance: { _gt: "0" }
      }
    ) {
      aggregate {
        count
        sum {
          balance
        }
      }
    }
  }
`

export const getContractsQuery = (contract: string, chain?: string): string => {
  let filter = `contract: { _eq: "${contract}" }`

  if (chain) {
    filter = filter + `, chain: { _eq: "${chain}" }`
  }

  return gql`
    query getContract {
      contracts(where: { ${filter} }) {
        block
        chain
        contract
        creator
        hash
        parsed
        verified
        contract_information {
          abi
          name
        }
        adapter {
          adapter_id
        }
      }
    }
  `
}

export const getContractsInteractionsQuery = ({
  fromAddress,
  chain,
  adapterId,
}: {
  fromAddress: string
  chain?: string
  adapterId?: string
}): string => {
  let transactionsFilter = `{ from_address: { _eq: "${fromAddress}" }`
  let erc20TransfersFilter = `{ to_address: { _eq: "${fromAddress}" }`

  if (chain) {
    transactionsFilter = transactionsFilter + `, chain: { _eq: "${chain}" }`
    erc20TransfersFilter = erc20TransfersFilter + `, chain: { _eq: "${chain}" }`
  }

  if (adapterId) {
    transactionsFilter = transactionsFilter + `, adapters_contracts: { adapter_id: { _eq: "${adapterId}" } }`
    erc20TransfersFilter = erc20TransfersFilter + `, adapters_contracts: { adapter_id: { _eq: "${adapterId}" } }`
  }

  transactionsFilter += '}'
  erc20TransfersFilter += '}'

  return gql`
    query contracts_interactions {
      transactions(
        where: ${transactionsFilter}
        distinct_on: [chain, to_address]
      ) {
        chain
        to_address
        adapters_contracts {
          adapter_id
          category
          name
          standard
          data
        }
      }

      erc20_transfers(
        where: ${erc20TransfersFilter}
        distinct_on: [chain, token]
      ) {
        chain
        token
        adapters_contracts {
          adapter_id
          category
          name
          standard
          data
        }
      }
    }
`
}

export const getBalancesGroupsQuery = ({
  fromAddress,
  chain,
  adapterId,
}: {
  fromAddress: string
  chain?: string
  adapterId?: string
}) => {
  let filter = `{ from_address: { _eq: "${fromAddress}" }`

  if (chain) {
    filter = filter + `, chain: { _eq: "${chain}" }`
  }

  if (adapterId) {
    filter = filter + `, adapters_contracts: { adapter_id: { _eq: "${adapterId}" } }`
  }

  filter += '}'

  return gql`
    query balances_groups {
      balances_groups(where:  ${filter}) {
        adapter_id
        chain
        balance_usd
        debt_usd
        reward_usd
        health_factor
        timestamp
        balances {
          address
          amount
          balance_usd
          category
          price
          data
          yields {
            chain
            adapter_id
            apy
            apy_base
            apy_reward
            apy_mean_30d
            il_risk
          }
        }
      }
    }
  `
}
