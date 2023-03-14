import { sliceIntoChunks } from '@lib/array'
import { IProtocol } from '@lib/protocols'
import { PoolClient } from 'pg'
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

export function deleteAllProtocols(client: PoolClient) {
  return client.query('DELETE FROM protocols WHERE true;', [])
}

export async function selectProtocols(client: PoolClient): Promise<IProtocol[]> {
  const protocolsRes = await client.query('select * from protocols', [])

  return protocolsRes.rows
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
          `INSERT INTO protocols (name, url, logo, category, slug, chain, chains, symbol, tvl, twitter, description, address, color) VALUES %L;`,
          chunk,
        ),
        [],
      ),
    ),
  )
}
