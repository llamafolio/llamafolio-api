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

export interface IProtocolLite {
  slug: string
  name: string
  url: string
  logo: string
  category: string
  chain: string
  chains: string[]
  tvl: number
}

export async function fetchProtocolsLite() {
  const res = await fetch('https://api.llama.fi/lite/protocols2')
  const data: IProtocolsLiteResponse = await res.json()

  const protocols: IProtocolLite[] = []

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
      ...protocol,
      slug: getProtocolSlug(protocol.name),
      chain: getChainName(protocol.chains),
    })
  }

  for (const parentId in childrenByParentId) {
    const parentProtocol = parentProtocolById[parentId]
    if (parentProtocol) {
      const children = childrenByParentId[parentId]
      const categories = Array.from(new Set(children.map((protocol) => protocol.category)))

      protocols.push({
        ...parentProtocol,
        slug: getProtocolSlug(parentProtocol.name),
        chain: getChainName(parentProtocol.chains),
        category: categories.length > 1 ? 'Multi-Category' : categories[0],
        tvl: sum(children.map((protocol) => protocol.tvl || 0)),
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
