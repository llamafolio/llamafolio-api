import { sliceIntoChunks } from '@lib/array'
import type { IProtocol } from '@lib/protocols'
import type { PoolClient } from 'pg'
import format from 'pg-format'

export interface IProtocolStorable {
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
  color?: string
}

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

const toRow = (protocol: IProtocolStorable) => {
  const chains = protocol.chains.toString()

  return [
    protocol.name,
    protocol.url,
    protocol.logo,
    protocol.category,
    protocol.slug,
    protocol.chain,
    `{ ${chains} }`,
    protocol.symbol,
    protocol.tvl,
    protocol.twitter,
    protocol.description,
    protocol.address,
    protocol.color,
  ]
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

export function deleteAllProtocols(client: PoolClient) {
  return client.query('DELETE FROM protocols WHERE true;', [])
}

export async function selectProtocols(client: PoolClient): Promise<IProtocol[]> {
  const protocolsRes = await client.query('select * from protocols', [])

  return fromStorage(protocolsRes.rows)
}

export async function insertProtocols(client: PoolClient, protocols: IProtocol[]) {
  const protocolsStorable = protocols.map(toRow)

  if (protocolsStorable.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(protocolsStorable, 200).map((chunk) =>
      client.query(
        format(
          `INSERT INTO protocols (
            name,
            url,
            logo,
            category,
            slug,
            chain,
            chains,
            symbol,
            tvl,
            twitter,
            description,
            address,
            color
          ) VALUES %L;`,
          chunk,
        ),
        [],
      ),
    ),
  )
}
