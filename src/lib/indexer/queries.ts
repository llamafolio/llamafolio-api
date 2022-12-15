import { gql } from 'graphql-request'

export const getTransactionHistoryQuery = (address: string, limit: number, offset: number): string => gql`
  query getTransactionHistory {
    txs(
      where: {
        _or: [
          { from_address: { _eq: "${address}" } }
          { to_address: { _eq: "${address}" } }
        ]
      }
      limit: ${limit}
      offset: ${offset}
      order_by: { timestamp: desc }
    ) {
      block_number
      chain
      timestamp
      from_address
      gas_price
      gas_used
      hash
      max_fee_per_gas
      max_priority_fee_per_gas
      to_address
      transaction_index
      transaction_type
      value
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
      receipt {
        success
      }
      contract_interacted {
        contract
        adapter_id {
          adapter_id
        }
      }
      method_name {
        name
      }
    }
  }
`
