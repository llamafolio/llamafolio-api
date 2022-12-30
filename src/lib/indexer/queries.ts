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
            ${chainsFilterParam}${protocolsFilterParams}
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
        logs_aggregate {
          nodes {
            topics
            data
            address
          }
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

export const getTokensInteractedQuery = (address: string, chain: string | undefined): string => {
  let chainFilter = ''
  if (chain) {
    chainFilter += `{ chain: { _eq: "${chain}" } }`
  }

  return gql`
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
          ${chainFilter}
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
}

export const getContractsInteractedQuery = (address: string, chain: string | undefined): string => {
  let chainFilter = ''
  if (chain) {
    chainFilter += `chain: { _eq: "${chain}" }`
  }

  return gql`
  query getContractsInteracted {
    contract_interactions(
      where: {
        address: { _eq: "${address}" }
        adapter_id: { adapter_id: { _is_null: false } }
        ${chainFilter}
      }
      distinct_on: contract
    ) {
      contract
      adapter_id {
        adapter_id
      }
    }
  }
`
}

export const getTokensDetailsQuery = (tokens: string[], chain: string | undefined): string => {
  const tokensFilter = []

  if (tokens.length > 0) {
    for (const token of tokens) {
      tokensFilter.push(`{ address: { _eq: "${token}" } }`)
    }
  }
  const tokensFilterParams = tokens.length > 0 ? `{ _or: [${tokensFilter}] }` : ''

  let chainFilter = ''
  if (chain) {
    chainFilter += `chain: { _eq: "${chain}" }`
  }

  return gql`
    query getTokensDetails {
      tokens(
        where: {
          _and: [
            ${tokensFilterParams}
            ${chainFilter}
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
