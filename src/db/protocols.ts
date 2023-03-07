import { IProtocol } from '@lib/protocols'
import { PoolClient } from 'pg'
import format from 'pg-format'

/* 
CREATE TABLE tmp1.protocols (
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
  palette VARCHAR[]
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
  palette?: string[]
}

const paletteToStorable = (palette: number[][] | undefined): string[] => {
  const storablePalette: string[] = []
  if (palette) {
    for (const color of palette) {
      storablePalette.push(`${color[0]}-${color[1]}-${color[2]}`)
    }
  }

  return storablePalette
}

const toRow = (protocol: IProtocolStorable) => {
  const chains = protocol.chains.toString()
  const pallete = protocol.palette?.toString()

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
    `{ ${pallete} }`,
  ]
}

const paletteFromStorable = (storedPalette: string[]): number[][] => {
  const palette: number[][] = []
  for (const color of storedPalette) {
    const colors = color.split('-')

    palette.push([parseInt(colors[0]), parseInt(colors[1]), parseInt(colors[2])])
  }

  return palette
}

export async function selectProtocols(client: PoolClient, ids?: string[]): Promise<IProtocol[]> {
  let query
  if (ids && ids.length > 0) {
    query = format(`select * from protocols where slug in (%L);`, ids)
  } else {
    query = 'select * from protocols'
  }

  const protocolsRes = await client.query(query, [])

  return protocolsRes.rows.map((protocol) => ({ ...protocol, palette: paletteFromStorable(protocol.palette) }))
}

export async function insertProtocols(client: PoolClient, protocols: IProtocol[]) {
  const protocolsStorable = protocols
    .map((protocol) => ({ ...protocol, palette: paletteToStorable(protocol.palette) }))
    .map(toRow)

  const query = format(
    `insert into protocols (name, url, logo, category, slug, chain, chains, symbol, tvl, twitter, description, address, palette) values %L;`,
    protocolsStorable,
  )

  await client.query(query, [])
}
