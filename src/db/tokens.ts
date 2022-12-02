import { ContractStandard } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface Token {
  address: string
  standard?: ContractStandard
  name?: string
  symbol: string
  decimals: number
  totalSupply?: number
  coingeckoId?: string
  cmcId?: string | null
  updated_at: Date
}

export interface TokenStorage {
  address: Buffer
  standard: ContractStandard | null
  name: string | null
  symbol: string
  decimals: number
  total_supply: string | null
  coingecko_id: string | null
  cmc_id: string | null
  updated_at: string
}

export interface TokenStorable {
  address: Buffer
  standard?: ContractStandard
  name?: string
  symbol: string
  decimals: number
  totalSupply?: number
  coingeckoId?: string
  cmcId?: string | null
  updated_at: Date
}

export function fromStorage(tokensStorage: TokenStorage[]) {
  const tokens: Token[] = []

  for (const tokenStorage of tokensStorage) {
    const token: Token = {
      address: bufToStr(tokenStorage.address),
      standard: tokenStorage.standard || undefined,
      name: tokenStorage.name || undefined,
      symbol: tokenStorage.symbol,
      decimals: tokenStorage.decimals,
      totalSupply: tokenStorage.total_supply ? parseInt(tokenStorage.total_supply) : undefined,
      coingeckoId: tokenStorage.coingecko_id || undefined,
      cmcId: tokenStorage.cmc_id,
      updated_at: new Date(tokenStorage.updated_at),
    }

    tokens.push(token)
  }

  return tokens
}

export function toRow(token: TokenStorable) {
  return [
    token.address,
    token.standard,
    token.name,
    token.symbol,
    token.decimals,
    token.totalSupply,
    token.coingeckoId,
    token.cmcId,
    token.updated_at,
  ]
}

export function toStorage(tokens: Token[]) {
  const tokensStorable: TokenStorable[] = []

  for (const token of tokens) {
    const { address, standard, name, symbol, decimals, totalSupply, coingeckoId, cmcId, updated_at } = token

    const tokenStorable: TokenStorable = {
      address: strToBuf(address),
      standard,
      name,
      symbol,
      decimals,
      totalSupply,
      coingeckoId,
      cmcId,
      updated_at,
    }

    tokensStorable.push(tokenStorable)
  }

  return tokensStorable
}

export async function selectChainTokens(client: PoolClient, chain: Chain, tokens: string[]) {
  const tokensRes = await client.query(
    format(`select * from %I.tokens where address in (%L);`, chain, tokens.map(strToBuf)),
    [],
  )

  return fromStorage(tokensRes.rows)
}

export async function selectUndecodedChainAddresses(client: PoolClient, chain: Chain) {
  const tokensRes = await client.query(
    format(
      `select distinct(token_address) from %I.token_transfers where token_address not in (select address from ethereum.tokens) limit 1000;`,
      chain,
    ),
    [],
  )

  return tokensRes.rows.map(({ token_address }) => bufToStr(token_address))
}

export function insertTokens(client: PoolClient, chain: Chain, tokens: Token[]) {
  const values = toStorage(tokens).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          'INSERT INTO %I.tokens (address, standard, name, symbol, decimals, total_supply, coingecko_id, cmc_id, updated_at) VALUES %L ON CONFLICT DO NOTHING;',
          chain,
          chunk,
        ),
        [],
      ),
    ),
  )
}
