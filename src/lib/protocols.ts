import { keyBy } from '@lib/array'
import { chainById, parseDefiLlamaChainAddress } from '@lib/chains'
import { sum } from '@lib/math'
import { isNotNullish } from '@lib/type'

export interface IParentProtocolLiteResponse {
  chains: string[]
  cmcId: string
  description: string
  gecko_id: string
  id: string
  logo: string
  name: string
  twitter: string
  url: string
}

export interface IProtocolLiteResponse {
  category: string
  chainTvls: {
    [key: string]: {
      tvl: number
      tvlPrevDay: number
      tvlPrevWeek: number
      tvlPrevMonth: number
    }
  }
  chains: string[]
  logo: string
  mcap: number
  name: string
  oracles: string[]
  referralUrl: string
  symbol: string
  tvl: number
  tvlPrevDay: number
  tvlPrevMonth: number
  tvlPrevWeek: number
  url: string
  parentProtocol?: string
}

export interface IProtocolConfig {
  id: string
  name: string
  address: string
  symbol: string
  url: string
  description: string
  chain: string
  logo: string
  audits: string
  audit_note: string
  gecko_id: string
  cmcId: string
  category: string
  chains: string[]
  module: string
  twitter: string
  audit_links: string[]
  oracles: string[]
  language: string
  governanceID: string[]
  treasury: string
  parentProtocol: string
  referralUrl: string
  forkedFrom: string[]
  openSource?: boolean
  listedAt?: number
}

export interface IProtocol {
  name: string
  url: string
  logo: string
  category: string
  slug: string
  parent_slug?: string
  chain: string
  chains: string[]
  symbol?: string
  tvl: number
  twitter?: string
  description?: string
  address?: string
  updated_at?: string
}

export async function fetchProtocols(adapterIds: string[]): Promise<IProtocol[]> {
  const [protocols, protocolsDetails] = await Promise.all([
    fetchProtocolsLite(adapterIds),
    fetchProtocolsConfig(adapterIds),
  ])

  const protocolBySlug = keyBy(protocols, 'slug')
  const protocolDetailsBySlug = keyBy(protocolsDetails, 'slug')

  return adapterIds
    .map((id) => {
      const protocol = protocolBySlug[id]
      const protocolDetails = protocolDetailsBySlug[id]
      if (!protocol) {
        console.log('Failed to fetch protocol info', id)
        return null
      }

      return { ...protocol, ...(protocolDetails || {}) }
    })
    .filter(isNotNullish)
}

async function fetchProtocolsConfig(adapterIds: string[]) {
  const res = await fetch('https://api.llama.fi/config')
  const data = await res.json()

  const _adapterIds = new Set(adapterIds)

  const filteredData = data.protocols
    .filter((protocol: { name: string }) => _adapterIds.has(getProtocolSlug(protocol.name)))
    .map((protocol: { symbol: string; twitter: string; description: string; address: string; name: string }) => ({
      symbol: protocol.symbol,
      twitter: protocol.twitter,
      description: protocol.description,
      // maybe `chain:address`
      address: parseDefiLlamaChainAddress(protocol.address).address,
      slug: getProtocolSlug(protocol.name),
    }))

  return filteredData
}

export async function fetchProtocolToParentMapping() {
  const configRes = await fetch('https://api.llama.fi/config')
  const config = await configRes.json()

  const protocolToParent: { [key: string]: string } = {}

  for (const protocol of config.protocols) {
    const slug = getProtocolSlug(protocol.name)
    if (protocol.parentProtocol) {
      const parentSlug = getProtocolSlug(protocol.parentProtocol.split('parent#')[1])
      protocolToParent[slug] = parentSlug
    }
  }

  return protocolToParent
}

export async function fetchProtocolsLite(adapterIds: string[]) {
  const res = await fetch('https://api.llama.fi/lite/protocols2')
  const data = await res.json()

  const _adapterIds = new Set(adapterIds)

  const protocols: IProtocol[] = []

  const parentProtocolById: { [key: string]: IParentProtocolLiteResponse } = {}

  for (const parentProtocol of data.parentProtocols) {
    parentProtocolById[parentProtocol.id] = parentProtocol
  }

  const childrenByParentId: { [key: string]: IProtocolLiteResponse[] } = {}

  for (const protocol of data.protocols) {
    if (protocol.parentProtocol) {
      if (!childrenByParentId[protocol.parentProtocol]) {
        childrenByParentId[protocol.parentProtocol] = []
      }
      childrenByParentId[protocol.parentProtocol].push(protocol)
    }

    protocols.push({
      slug: getProtocolSlug(protocol.name),
      parent_slug: protocol.parentProtocol ? getProtocolSlug(protocol.parentProtocol.split('parent#')[1]) : undefined,
      chain: getChainName(protocol.chains),
      name: protocol.name,
      url: protocol.url,
      logo: protocol.logo,
      category: protocol.category,
      chains: protocol.chains,
      tvl: protocol.tvl,
    })
  }

  for (const parentId in childrenByParentId) {
    const parentProtocol = parentProtocolById[parentId]
    if (parentProtocol) {
      const children = childrenByParentId[parentId]
      const categories = Array.from(new Set(children.map((protocol) => protocol.category)))

      protocols.push({
        slug: getProtocolSlug(parentProtocol.name),
        chain: getChainName(parentProtocol.chains),
        category: categories.length > 1 ? 'Multi-Category' : categories[0],
        tvl: sum(children.map((protocol) => protocol.tvl || 0)),
        name: parentProtocol.name,
        url: parentProtocol.url,
        logo: parentProtocol.logo,
        chains: parentProtocol.chains,
      })
    }
  }

  return protocols.filter((protocol) => _adapterIds.has(protocol.slug))
}

export function getProtocolSlug(name: string) {
  return name?.toLowerCase().split(' ').join('-').split("'").join('') ?? ''
}

function getChainName(chains: string[]) {
  if (chains.length === 0) {
    return ''
  }

  if (chains.length > 1) {
    return 'Multi-Chain'
  }

  // use our naming if possible
  const chain = chainById[chains[0].toLowerCase()]
  if (chain) {
    return chain.name
  }

  return chains[0]
}
