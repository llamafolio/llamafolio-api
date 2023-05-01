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
