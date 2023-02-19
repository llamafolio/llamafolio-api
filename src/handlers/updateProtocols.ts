import { adapters } from '@adapters/index'
import { STAGE } from '@env'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { sum } from '@lib/math'
import { getChainName, getProtocolSlug } from '@lib/protocols'
import { APIGatewayProxyHandler } from 'aws-lambda'
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
  symbol?: string
}

export type TProtocolCategory =
  | 'Algo-Stables'
  | 'Bridge'
  | 'CDP'
  | 'CEX'
  | 'Chain'
  | 'Cross Chain'
  | 'Derivatives'
  | 'Dexes'
  | 'Exotic Options'
  | 'Farm'
  | 'Gaming'
  | 'Indexes'
  | 'Insurance'
  | 'Launchpad'
  | 'Lending'
  | 'Leveraged Farming'
  | 'Liquid Staking'
  | 'NFT Lending'
  | 'NFT Marketplace'
  | 'Options'
  | 'Oracle'
  | 'Payments'
  | 'Prediction Market'
  | 'Privacy'
  | 'RWA Lending'
  | 'Reserve Currency'
  | 'RWA'
  | 'Services'
  | 'Staking'
  | 'Synthetics'
  | 'Uncollateralized Lending'
  | 'Yield'
  | 'Yield Aggregator'

export interface IConfigProtocol {
  id: string
  name: string
  address: null | string
  symbol: string
  url: string
  description: null | string
  chain: string
  logo: string
  audits: null | string
  audit_note?: null | string
  gecko_id: null | string
  cmcId: null | string
  category: TProtocolCategory
  chains: string[]
  module: string
  twitter?: null | string
  audit_links?: string[]
  oracles?: string[]
  language?: string
  parentProtocol?: string
  referralUrl?: string
  forkedFrom?: string[]
  openSource?: boolean
  listedAt?: number
}

export interface IConfigResponse {
  protocols: IConfigProtocol[]
  chainCoingeckoIds: { [key: string]: any }
}

export const DEFILLAMA_API = 'https://api.llama.fi'

async function fetchProtocolsLite() {
  const res = await fetch(`${DEFILLAMA_API}/lite/protocols2`)

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
      chain: getChainName(protocol.chains),
      slug: getProtocolSlug(protocol.name),
    })
  }

  for (const parentId in childrenByParentId) {
    const parentProtocol = parentProtocolById[parentId]
    if (parentProtocol) {
      const children = childrenByParentId[parentId]
      const categories = Array.from(new Set(children.map((protocol) => protocol.category)))

      protocols.push({
        ...parentProtocol,
        category: categories.length > 1 ? 'Multi-Category' : categories[0],
        chain: getChainName(parentProtocol.chains),
        slug: getProtocolSlug(parentProtocol.name),
        tvl: sum(children.map((protocol) => protocol.tvl || 0)),
      })
    }
  }

  return protocols
}

export async function fetchProtocols(): Promise<IProtocolLite[]> {
  const protocols = await fetchProtocolsLite()

  const adaptersIds: string[] = adapters.map((adapter) => adapter.id)

  const protocolsFiltered = protocols.filter((protocol: { slug: string }) => adaptersIds.includes(protocol.slug))

  return protocolsFiltered
}

const updateProtocols: APIGatewayProxyHandler = async () => {
  // run in a Lambda because of APIGateway timeout
  await invokeLambda(`llamafolio-api-${STAGE}-updateProtocols`, {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocol = wrapScheduledLambda(updateProtocols)
export const handleUpdateProtocols = updateProtocols

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  try {
    return success({})
  } catch (e) {
    console.error('Failed to update protocols information', e)
    return serverError('Failed to update protocols information')
  }
}
