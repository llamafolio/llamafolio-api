import { toStartOfDay, unixFromDate } from '@lib/fmt'
import type { UnixTimestamp } from '@lib/type'
import { GraphQLClient } from 'graphql-request'

export const DOMAINS_QUERY = `
  query getDomains($address: String!, $expiryDateGte: Int!) {
    account(id: $address) {
      registrations(
        orderBy:expiryDate, orderDirection:asc,
        where:{ expiryDate_gte: $expiryDateGte }
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
  fromAddress: string
  domainName: string
  owner: string
  registrant: string
  expiryDate: UnixTimestamp
  registrationDate: UnixTimestamp
}

const endpoint = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'
const client = new GraphQLClient(endpoint, {
  headers: {
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
  },
})

export async function getENSRegistrations(addresses: `0x${string}`[]) {
  const res: ENSRegistration[] = []

  const responses = (await Promise.all(
    addresses.map((address) =>
      client.request(DOMAINS_QUERY, {
        address: address.toLowerCase(),
        expiryDateGte: unixFromDate(toStartOfDay(new Date())),
      }),
    ),
  )) as DomainsResponse[]

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i]
    const registrations = response?.account?.registrations || []

    for (const registration of registrations) {
      res.push({
        fromAddress: addresses[i],
        domainName: registration.domain.name,
        owner: registration.domain.owner.id,
        registrant: registration.domain.registrant.id,
        expiryDate: parseInt(registration.expiryDate),
        registrationDate: parseInt(registration.registrationDate),
      })
    }
  }

  return res
}
