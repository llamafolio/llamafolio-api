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
  tvl BIGINT NOT NULL,
  twitter VARCHAR,
  description VARCHAR,
  address VARCHAR,
  palette VARCHAR[]
);
*/

const paletteToStorable = (palette: number[][] | undefined): string[] => {
  const storablePalette: string[] = []
  for (const color in palette) {
    storablePalette.push(`${color[0]}-${color[1]}-${color[2]}`)
  }
  return storablePalette
}
const paletteFromStorable = (storedPalette: string[]): number[][] => {
  const palette: number[][] = []
  for (const color in storedPalette) {
    const colors = color.split('-')

    palette.push([parseInt(colors[0]), parseInt(colors[1]), parseInt(colors[2])])
  }

  return palette
}

export async function selectProtocols(client: PoolClient, ids?: string[]): Promise<IProtocol[]> {
  let query
  if (ids) {
    query = format(`select * from protocols where id in (%L);`, ids)
  } else {
    query = 'select * from protocols'
  }

  const protocolsRes = await client.query(query, [])

  return protocolsRes.rows.map((protocol) => ({ ...protocol, palette: paletteFromStorable(protocol.palette) }))
}

export async function insertProtocols(client: PoolClient, protocols: IProtocol[]) {
  const protocolsStorable = protocols.map((protocol) => ({ ...protocol, palette: paletteToStorable(protocol.palette) }))

  await client.query(
    format(
      `insert into protocols (name, url, logo, category, slug, chain, chains, symbol, tvl, twitter, description, address, palette) values (%L);`,
      protocolsStorable,
    ),
    [],
  )
}
