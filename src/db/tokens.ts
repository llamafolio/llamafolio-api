import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
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

export async function selectUndecodedProtocolsTokens(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: `
      SELECT * FROM (
        (
          SELECT "chain", "address" FROM lf.adapters_contracts
        )
          UNION DISTINCT
        (
          SELECT "chain", "token" AS "address" FROM lf.adapters_contracts WHERE "token" <> ''
        )
          UNION DISTINCT
        (
          SELECT "chain", "address" FROM lf.adapters_contracts
          ARRAY JOIN "underlyings" AS "address"
        )
          UNION DISTINCT
        (
          SELECT "chain", "address" FROM lf.adapters_contracts
          ARRAY JOIN "rewards" AS "address"
        )
      )
      WHERE
        ("chain", "address") NOT IN (
          SELECT "chain", "address" FROM evm_indexer2.tokens WHERE type = 'erc20' GROUP BY "chain", "address"
        ) AND ("chain", "address") NOT IN (
          SELECT "chain", "address" FROM ${environment.NS_LF}.tokens_decode_errors WHERE type = 'erc20' GROUP BY "chain", "address"
        )
      GROUP BY "chain", "address";
    `,
  })

  const res = (await queryRes.json()) as {
    data: { chain: string; address: `0x${string}` }[]
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

export async function insertERC20TokensDecodeErrors(client: ClickHouseClient, tokens: Partial<Token>[]) {
  const values: { chain: number; address: string; type: 'erc20'; sign: number }[] = []

  for (const token of tokens) {
    if (token.chain == null || token.address == null) {
      continue
    }

    const chainId = chainById[token.chain]?.chainId
    if (chainId == null) {
      continue
    }

    values.push({ chain: chainId, address: token.address, type: 'erc20', sign: 1 })
  }

  if (values.length === 0) {
    return
  }

  await client.insert({
    table: `${environment.NS_LF}.tokens_decode_errors`,
    values,
    format: 'JSONEachRow',
  })
}
