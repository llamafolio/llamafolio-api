import { sliceIntoChunks } from '@lib/array'
import { Chain, chainIdResolver } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface ERC20Token {
  address: string
  chain: Chain
  name?: string
  symbol: string
  decimals: number
  coingeckoId?: string
  cmcId?: string | null
}

export interface ERC20TokenStorage {
  address: string
  chain: string
  name: string | null
  symbol: string
  decimals: number
  coingecko_id: string | null
  cmc_id: string | null
}

export interface ERC20TokenStorable {
  address: string
  chain: Chain
  name?: string
  symbol: string
  decimals: number
  coingeckoId?: string | null
  cmcId?: string | null
}

export function fromERC20Storage(tokensStorage: ERC20TokenStorage[]) {
  const tokens: ERC20Token[] = []

  for (const tokenStorage of tokensStorage) {
    const token: ERC20Token = {
      address: tokenStorage.address,
      chain: (chainIdResolver[tokenStorage.chain] || tokenStorage.chain) as Chain,
      name: tokenStorage.name || undefined,
      symbol: tokenStorage.symbol,
      decimals: tokenStorage.decimals,
      coingeckoId: tokenStorage.coingecko_id || undefined,
      cmcId: tokenStorage.cmc_id,
    }

    tokens.push(token)
  }

  return tokens
}

export function toRow(token: ERC20TokenStorable) {
  return [token.address, token.chain, token.name, token.symbol, token.decimals, token.coingeckoId, token.cmcId]
}

export function toERC20Storage(tokens: ERC20Token[]) {
  const tokensStorable: ERC20TokenStorable[] = []

  for (const token of tokens) {
    const { address, chain, name, symbol, decimals, coingeckoId, cmcId } = token

    const tokenStorable: ERC20TokenStorable = {
      address,
      chain,
      name,
      symbol,
      decimals,
      coingeckoId,
      cmcId,
    }

    tokensStorable.push(tokenStorable)
  }

  return tokensStorable
}

export async function selectChainTokens(client: PoolClient, chain: Chain, tokens: string[]) {
  const tokensRes = await client.query(
    format(`select * from erc20_tokens where chain = %L and address in (%L);`, chain, tokens),
    [],
  )

  return fromERC20Storage(tokensRes.rows)
}

export async function selectUndecodedChainAddresses(client: PoolClient, limit?: number, offset?: number) {
  const tokensRes = await client.query(
    format(
      `
      select distinct transfer.chain, transfer.token from erc20_transfers as transfer
      where not exists (
        select 1 from erc20_tokens as token
        where token.chain = transfer.chain and token.address = transfer.token
        ) limit %L offset %L;
      `,
      limit || 100,
      offset || 0,
    ),
    [],
  )

  return tokensRes.rows.map(({ chain, token }) => [chain, token])
}

export function insertERC20Tokens(client: PoolClient, tokens: ERC20Token[]) {
  const values = toERC20Storage(tokens).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          `INSERT INTO erc20_tokens (
            address,
            chain,
            name,
            symbol,
            decimals,
            coingecko_id,
            cmc_id
          ) VALUES %L ON CONFLICT (address, chain) DO
            UPDATE SET
              (coingecko_id, cmc_id) = (EXCLUDED.coingecko_id, EXCLUDED.cmc_id);`,
          chunk,
        ),
        [],
      ),
    ),
  )
}
