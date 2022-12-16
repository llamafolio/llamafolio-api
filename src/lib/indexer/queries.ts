import { gql } from 'graphql-request'

export const getTransactionHistoryQuery = (
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
): string => {
  const filters = []

  filters.push(`{ from_address: { _eq: "${address}" } }`)
  filters.push(`{ to_address: { _eq:"${address}" } }`)

  if (chainsFilter.length > 0) {
    for (const chain of chainsFilter) {
      filters.push(`{ chain: { _eq: "${chain}" } }`)
    }
  }

  if (protocolsFilter.length > 0) {
    for (const protocol of protocolsFilter) {
      filters.push(`{ contract_interacted: { adapter_id: { adapter_id: { _eq: "${protocol}" } } } }`)
    }
  }

  return gql`
    query getTransactionHistory {
      txs(
        where: {
          _or: [${filters}]
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
}
