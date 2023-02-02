import { gql } from 'graphql-request'

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
                {
                  _or: [
                    { from_address: { _eq: "${address}" } }, { to_address: { _eq:"${address}" } }
                  ]
                }
                ${filtersParams}
              ]
            }
            limit: ${limit}
            offset: ${offset}
            order_by: { timestamp: desc }
          ) {
            contract_interacted {
              adapter {
                adapter_id
              }
              contract
              parsed
              verified
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
            receipts {
              status
            }
            timestamp
            to_address
            token_transfers_aggregate(order_by: { log_index: asc }) {
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
                {
                  _or: [
                    { from_address: { _eq: "${address}" } }, { to_address: { _eq:"${address}" } }
                  ]
                }
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

export const getContractsInteractedQuery = (address: string): string => gql`
      query getContractsInteracted {
        transactions(where: {_and: [{_or: [{from_address: {_eq: "${address}"}}]}], contract_interacted: {contract: {_is_null: false}}}, distinct_on: to_address) {
          contract_interacted {
            adapter {
              adapter_id
            }
            contract
            chain
          }
        }
      }
    `

export const getTokensInteractedQuery = (address: string): string => gql`
    query getTokensInteracted {
      erc20_transfers(distinct_on: token, where: {_and: [{_or: [{from_address: {_eq: "${address}"}}, {to_address: {_eq: "${address}"}}]}]}) {
        token_details {
          address
          chain
          decimals
          name
          symbol
        }
      }
    }
`

export const getTokensBalancesQuery = (address: string): string => gql`
  query getTokensBalances {
    erc20_balances(where: { address: { _eq: "${address}" } }) {
      balance
      chain
      token
      token_details {
        name
        symbol
        decimals
      }
    }
  }
`

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

export const getContractsQuery = (contract: string): string => gql`
    query getContract {
      contracts(where: { contract: { _eq: "${contract}" } }) {
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

export const getContractForChainQuery = (chain: string, contract: string): string => gql`
    query getContract {
      contracts(where: { chain: { _eq: "${chain}" }, contract: { _eq: "${contract}" } }) {
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
