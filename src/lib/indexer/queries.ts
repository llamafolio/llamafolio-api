import { gql } from 'graphql-request'

export const getTransactionHistoryQuery = (
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
): string => {
  const chains = []

  if (chainsFilter.length > 0) {
    for (const chain of chainsFilter) {
      chains.push(`{ chain: { _eq: "${chain}" } }`)
    }
  }

  const chainsFilterParam = chains.length > 0 ? `{ _or: [${chains}] }` : ''

  const protocols = []

  if (protocolsFilter.length > 0) {
    for (const protocol of protocolsFilter) {
      protocols.push(`{ contract_interacted: { adapter_id: { adapter_id: { _eq: "${protocol}" } } } }`)
    }
  }

  const protocolsFilterParams = protocols.length > 0 ? `{ _or: [${protocols}] }` : ''

  return gql`
    query getTransactionHistory {
      txs(
        where: {
          _and: [
            {
              _or: [
                { from_address: { _eq: "${address}" } }, { to_address: { _eq:"${address}" } }
              ]
            }
            ${chainsFilterParam}
            ${protocolsFilterParams}
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
      txs_aggregate(
        where: {
          _and: [
            {
              _or: [
                { from_address: { _eq: "${address}" } }, { to_address: { _eq:"${address}" } }
              ]
            }
            ${chainsFilterParam}
            ${protocolsFilterParams}
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

export const getTokensInteractedQuery = (address: string): string => gql`
  query getTokensInteracted {
    token_transfers(
      where: {
        _and: [
          {
            _or: [
              { from_address: { _eq: "${address}" } }
              { to_address: { _eq: "${address}" } }
            ]
          }
        ]
      }
      distinct_on: token
    ) {
      token
      chain
      token_details {
        decimals
        name
        symbol
      }
    }
  }
`

export const getContractsInteractedQuery = (address: string): string => gql`
  query getContractsInteracted {
    contract_interactions(where: {address: {_eq: "${address}"}, adapter_id: {adapter_id: {_is_null: false}}}, distinct_on: contract) {
      contract
      adapter_id {
        adapter_id
      }
    }
  }
`

export const getTokensDetailsQuery = (tokens: string[]): string => {
  const tokensFilter = []

  if (tokens.length > 0) {
    for (const token of tokens) {
      tokensFilter.push(`{ address: { _eq: "${token}" } }`)
    }
  }
  const tokensFilterParams = tokens.length > 0 ? `{ _or: [${tokensFilter}] }` : ''

  return gql`
    query getTransactionHistory {
      tokens(
        where: {
          _and: [
            ${tokensFilterParams}
          ]
        }
      ) {
        chain
        decimals
        symbol
        name
        address
      }
    }
  `
}
