import type { ClickHouseClient } from '@clickhouse/client'
import type { IProtocol } from '@lib/protocols'

export interface ProtocolStorage {
  name: string
  url: string
  logo: string
  category: string
  slug: string
  chain: string
  chains: string[]
  symbol: string | null
  tvl: string
  twitter: string | null
  description: string | null
  address: string | null
  color: string | null
}

export function fromRowStorage(protocolStorage: ProtocolStorage) {
  const protocol: IProtocol = {
    name: protocolStorage.name,
    url: protocolStorage.url,
    logo: protocolStorage.logo,
    category: protocolStorage.category,
    slug: protocolStorage.slug,
    chain: protocolStorage.chain,
    chains: protocolStorage.chains,
    symbol: protocolStorage.symbol || undefined,
    tvl: protocolStorage.tvl != null ? parseFloat(protocolStorage.tvl) : 0,
    twitter: protocolStorage.twitter || undefined,
    description: protocolStorage.description || undefined,
    address: protocolStorage.address || undefined,
    color: protocolStorage.color || undefined,
  }

  return protocol
}

export function fromStorage(protocolsStorage: ProtocolStorage[]) {
  return protocolsStorage.map(fromRowStorage)
}

export function deleteProtocol(client: ClickHouseClient, slug: string) {
  return client.command({
    query: 'DELETE FROM lf.protocols WHERE slug = {slug: String};',
    query_params: { slug },
  })
}

export async function selectProtocols(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: 'SELECT * FROM lf.protocols FINAL;',
  })

  const res = (await queryRes.json()) as {
    data: ProtocolStorage[]
  }

  return fromStorage(res.data)
}

export async function insertProtocols(client: ClickHouseClient, protocols: IProtocol[]) {
  if (protocols.length === 0) {
    return
  }

  await client.insert({
    table: 'lf.protocols',
    values: protocols,
    format: 'JSONEachRow',
  })
}
