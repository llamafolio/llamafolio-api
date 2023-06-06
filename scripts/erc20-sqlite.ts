import type { Chain } from '@lib/chains'
import { Database, type SQLQueryBindings } from 'bun:sqlite'

const database = new Database('erc20.sqlite', { create: true, readwrite: true })

main()

async function main() {
  try {
    if (process.argv[2] === 'create') {
      createTable()
    }
    const jsonArray = await csvToJSON()
    await jsonToSQLite(jsonArray)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

//`select * from erc20_tokens where chain = %L and address in (%L);`
export function getChainTokens(chain: string, tokens: string) {
  const query = database.query(/*sql*/ `
    SELECT * FROM erc20 WHERE chain = $chain AND address IN ($tokens)
`)
  const result = query.all({ $chain: chain, $tokens: tokens })
  return result
}

function createTable() {
  console.log('creating table')
  const _createTableQuery = /*sql*/ `
  CREATE TABLE IF NOT EXISTS erc20 (
    address TEXT,
    chain TEXT,
    decimals INTEGER,
    name TEXT,
    symbol TEXT,
    coingecko_id TEXT DEFAULT NULL,
    cmc_id TEXT DEFAULT NULL
)`
  database.query(_createTableQuery).run()
}

interface Token {
  address: string
  chain: Chain
  decimals: number
  name: string
  symbol: string
  coingeckoId: string
  cmcId: string
}

const _chains = [
  'ethereum',
  'polygon',
  'optimism',
  'arbitrum',
  'xdai',
  'bsc',
  'avax',
  'fantom',
  'harmony',
  'celo',
] as const

export const prepend$ToKeys = <T extends Token>(parameter: T) =>
  Object.fromEntries(Object.entries(parameter).map(([key, value]) => [`$${key}`, value]))

async function csvToJSON() {
  const csvFilePath = './erc20s.csv'
  const file = Bun.file(csvFilePath)
  const csv = await file.text()
  const lines = csv.split('\n')
  const headers = lines[0].split(',')
  const tokens = lines.slice(1).map((line) => {
    const token = line.split(',')
    return Object.fromEntries(
      headers.map((header, i) => [
        JSON.parse(header),
        ['', '\r'].includes(token[i]) ? null : typeof token[i] === 'string' ? token[i].replaceAll('"', '') : token[i],
      ]),
    )
  })
  return tokens
}

async function jsonToSQLite(jsonArray: Array<Token>) {
  const insert = database.prepare<Array<Token>, SQLQueryBindings>(/*sql*/ `INSERT INTO erc20
      (address, chain, decimals, name, symbol, coingecko_id, cmc_id)
      VALUES ($address, $chain, $decimals, $name, $symbol, $coingecko_id, $cmc_id)`)
  // @ts-expect-error
  const insertMany = database.transaction((tokens: Token[]) => tokens.map((token) => insert.run(token)))
  return insertMany(jsonArray.map((token) => prepend$ToKeys(token)))
}
