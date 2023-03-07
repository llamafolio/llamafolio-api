// @ts-ignore
import { chainById, chainIdResolver } from '@lib/chains'
import { getPaletteFromURL } from 'color-thief-node'
import { sum } from 'lodash'
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
  chain: string
  chains: string[]
  symbol?: string
  tvl: number
  twitter?: string
  description?: string
  address?: string
  pallete?: number[][]
}

export async function fetchProtocols(adapters: string[]): Promise<IProtocol[]> {
  const [protocols, protocolsDetails] = await Promise.all([
    fetchProtocolsLite(adapters),
    fetchProtocolsConfig(adapters),
  ])

  const palletes = await fetchProtocolColorPallete(protocols)

  const fullProtocolsData = []

  for (let i = 0; i < protocols.length; i++) {
    const extraData = protocolsDetails.find((protocol: { slug: string }) => protocol.slug === protocols[i].slug)
    const pallete = palletes.find((protocol: { slug: string }) => protocol.slug === protocols[i].slug)

    fullProtocolsData.push({ ...protocols[i], ...extraData, pallete: pallete?.pallete })
  }

  return fullProtocolsData
}

async function fetchProtocolColorPallete(protocols: IProtocol[]): Promise<{ pallete: number[][]; slug: string }[]> {
  const palletes = await Promise.all(protocols.map((protocol) => getProtocolPallete(protocol)))

  return palletes
}

async function getProtocolPallete(protocol: IProtocol): Promise<{ pallete: number[][]; slug: string }> {
  const pallete = await getPaletteFromURL(protocol.logo, 10, 10)
  return { pallete, slug: protocol.slug }
}

async function fetchProtocolsConfig(adapters: string[]) {
  const res = await fetch('https://api.llama.fi/config')

  const data = await res.json()

  const filteredData = data.protocols
    .filter((protocol: { name: string }) => adapters.includes(getProtocolSlug(protocol.name)))
    .map((protocol: { symbol: string; twitter: string; description: string; address: string; name: string }) => ({
      symbol: protocol.symbol,
      twitter: protocol.twitter,
      description: protocol.description,
      address: protocol.address,
      slug: getProtocolSlug(protocol.name),
    }))

  return filteredData
}

async function fetchProtocolsLite(adapters: string[]) {
  const res = await fetch('https://api.llama.fi/lite/protocols2')

  const data = await res.json()

  const filteredData = {
    parentProtocols: data.parentProtocols.filter((protocol: { name: string }) =>
      adapters.includes(getProtocolSlug(protocol.name)),
    ),
    protocols: data.protocols.filter((protocol: { name: string }) => adapters.includes(getProtocolSlug(protocol.name))),
  }

  const protocols: IProtocol[] = []

  const parentProtocolById: { [key: string]: IParentProtocolLiteResponse } = {}

  for (const parentProtocol of filteredData.parentProtocols) {
    parentProtocolById[parentProtocol.id] = parentProtocol
  }

  const childrenByParentId: { [key: string]: IProtocolLiteResponse[] } = {}

  for (const protocol of filteredData.protocols) {
    if (protocol.parentProtocol) {
      if (!childrenByParentId[protocol.parentProtocol]) {
        childrenByParentId[protocol.parentProtocol] = []
      }
      childrenByParentId[protocol.parentProtocol].push(protocol)
    }

    protocols.push({
      slug: getProtocolSlug(protocol.name),
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
