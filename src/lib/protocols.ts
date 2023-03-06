import { adapters } from '@adapters/index'
import { chainById, chainIdResolver } from '@lib/chains'
import { sum } from '@lib/math'
import fetch from 'node-fetch'

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

export interface IProtocolsLiteResponse {
  protocols: IProtocolLiteResponse[]
  parentProtocols: IParentProtocolLiteResponse[]
}

export interface IProtocol {
  slug: string
  name: string
  url: string
  logo: string
  category: string
  chain: string
  chains: string[]
  tvl: number
  symbol?: string
}

export async function fetchProtocolsLite() {
  const res = await fetch('https://api.llama.fi/lite/protocols2')

  const data: IProtocolsLiteResponse = await res.json()

  const protocols: IProtocol[] = []

  const parentProtocolById: { [key: string]: IParentProtocolLiteResponse } = {}

  const adaptersIds = adapters.map((adapter) => adapter.id)

  const filteredProtocols: IProtocolsLiteResponse = {
    protocols: data.protocols.filter((protocol) => adaptersIds.includes(getProtocolSlug(protocol.name))),
    parentProtocols: data.parentProtocols.filter((protocol) => adaptersIds.includes(getProtocolSlug(protocol.name))),
  }

  for (const parentProtocol of filteredProtocols.parentProtocols) {
    parentProtocolById[parentProtocol.id] = parentProtocol
  }

  const childrenByParentId: { [key: string]: IProtocolLiteResponse[] } = {}

  for (const protocol of filteredProtocols.protocols) {
    if (protocol.parentProtocol) {
      if (!childrenByParentId[protocol.parentProtocol]) {
        childrenByParentId[protocol.parentProtocol] = []
      }
      childrenByParentId[protocol.parentProtocol].push(protocol)
    }

    protocols.push({
      chain: getChainName(protocol.chains),
      slug: getProtocolSlug(protocol.name),
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
        category: categories.length > 1 ? 'Multi-Category' : categories[0],
        chain: getChainName(parentProtocol.chains),
        slug: getProtocolSlug(parentProtocol.name),
        tvl: sum(children.map((protocol) => protocol.tvl || 0)),
        name: parentProtocol.name,
        url: parentProtocol.url,
        logo: parentProtocol.logo,
        chains: parentProtocol.chains,
      })
    }
  }

  return protocols
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
  const chain = chainById[chainIdResolver[chains[0].toLowerCase()]]
  if (chain) {
    return chain.name
  }

  return chains[0]
}
