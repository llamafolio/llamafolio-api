import type { TUnixTimestamp } from '@lib/type'
import { GraphQLClient } from 'graphql-request'

export const DOMAINS_QUERY = `
  query getDomains($address: String!) {
    account(id: $address) {
      registrations(
        orderBy:expiryDate, orderDirection:asc,
      ) {
        expiryDate
        registrationDate
        domain {
          name
          owner {
            id
          }
          registrant {
            id
          }
        }
      }
    }
  }
`

interface RegistrationResponse {
  expiryDate: string
  registrationDate: string
  domain: {
    name: string
    owner: {
      id: string
    }
    registrant: {
      id: string
    }
  }
}

interface DomainsResponse {
  account: {
    registrations: RegistrationResponse[]
  }
}

export interface ENSRegistration {
  domainName: string
  owner: string
  registrant: string
  expiryDate: TUnixTimestamp
  registrationDate: TUnixTimestamp
}

const endpoint = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'
const client = new GraphQLClient(endpoint, {
  headers: {
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
  },
})

export async function getENSRegistrations(address: `0x${string}`) {
  const { account } = (await client.request(DOMAINS_QUERY, { address: address.toLowerCase() })) as DomainsResponse

  const registrations: ENSRegistration[] = (account.registrations || []).map((registration) => ({
    domainName: registration.domain.name,
    owner: registration.domain.owner.id,
    registrant: registration.domain.registrant.id,
    expiryDate: parseInt(registration.expiryDate),
    registrationDate: parseInt(registration.registrationDate),
  }))

  return registrations
}
