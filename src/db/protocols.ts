import { sliceIntoChunks } from '@lib/array'
import { IProtocol } from '@lib/protocols'
import { PoolClient } from 'pg'
import format from 'pg-format'

/* 
CREATE TABLE protocols (
  name VARCHAR NOT NULL,
  url VARCHAR NOT NULL,
  logo VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  chain VARCHAR NOT NULL,
  chains VARCHAR[] NOT NULL,
  symbol VARCHAR,
  tvl DECIMAL NOT NULL,
  twitter VARCHAR,
  description VARCHAR,
  address VARCHAR,
  color VARCHAR
);
*/

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

export async function selectProtocols(client: PoolClient, ids?: string[]): Promise<IProtocol[]> {
  let query
  if (ids && ids.length > 0) {
    query = format(`select * from protocols where slug in (%L);`, ids)
  } else {
    query = 'select * from protocols'
  }

  const protocolsRes = await client.query(query, [])

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
