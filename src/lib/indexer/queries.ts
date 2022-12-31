import { gql } from 'graphql-request'

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
