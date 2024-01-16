import type { ClickHouseClient } from '@clickhouse/client'
import { type Chain, chainById } from '@lib/chains'
import { shortAddress } from '@lib/fmt'

export interface Token {
  address: string
  chain: Chain
  name?: string
  type: number
  symbol: string
  decimals: number
  coingecko_id?: string
  cmc_id?: string | null
  stable?: boolean | null
}

export function toTokenStorage(tokens: Token[]) {
  const tokensStorable: any[] = []

  for (const token of tokens) {
    const { address, chain, name, symbol, type, decimals, coingecko_id, cmc_id, stable } = token

    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.log(`Missing chain ${chain}`)
      continue
    }

    const tokenStorable = {
      address,
      chain: chainId,
      type,
      name,
      symbol: (symbol || '').replaceAll('\x00', ''),
      decimals,
      coingecko_id,
      cmc_id,
      stable,
    }

    tokensStorable.push(tokenStorable)
  }

  return tokensStorable
}

export async function selectToken(client: ClickHouseClient, chainId: number, address: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        "type",
        "decimals",
        "symbol",
        "name",
        "coingecko_id" AS "coingeckoId",
        "stable"
      FROM evm_indexer2.tokens
      WHERE
        "chain" = {chainId: UInt64} AND
        "address" = {address: String}
      LIMIT 1;
    `,
    query_params: {
      chainId,
      addressShort: shortAddress(address),
      address,
    },
  })

  const res = (await queryRes.json()) as {
    data: { type: string; decimals: number; symbol: string; name: string; coingeckoId: string; stable: boolean }[]
  }

  return res.data[0]
}

export async function selectUndecodedChainAddresses(
  client: ClickHouseClient,
  chainId: number,
  type: 'erc20' | 'erc721' | 'erc1155' = 'erc20',
  limit = 100,
  offset = 0,
) {
  const queryRes = await client.query({
    query: `
      SELECT
        distinct("address")
      FROM evm_indexer2.tokens_balances_mv
      WHERE
        "type" = {type: String} AND
        "chain" = {chainId: UInt64} AND
        ({chainId: UInt64}, "address") NOT IN (
          SELECT "chain", "address" FROM evm_indexer2.tokens
        )
      LIMIT {limit: UInt32}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      type,
      chainId,
      limit,
      offset,
    },
  })

  const res = (await queryRes.json()) as {
    data: { address: `0x${string}` }[]
  }

  return res.data
}

export async function insertERC20Tokens(client: ClickHouseClient, tokens: Token[]) {
  const values = toTokenStorage(tokens)

  if (values.length === 0) {
    return
  }

  await client.insert({
    table: 'evm_indexer2.tokens',
    values,
    format: 'JSONEachRow',
  })
}
