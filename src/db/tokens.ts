import type { ClickHouseClient } from '@clickhouse/client'
import { type Chain, chainById } from '@lib/chains'

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
      symbol: symbol.replaceAll('\x00', ''),
      decimals,
      coingecko_id,
      cmc_id,
      stable,
    }

    tokensStorable.push(tokenStorable)
  }

  return tokensStorable
}

export async function selectUndecodedChainAddresses(client: ClickHouseClient, limit?: number, offset?: number) {
  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "address"
      FROM evm_indexer.token_transfers
      WHERE ("chain", "address") NOT IN (
        SELECT "chain", "address" FROM evm_indexer.tokens
      )
      GROUP BY "chain", "address"
      LIMIT {limit: UInt32}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      limit: limit || 100,
      offset: offset || 0,
    },
  })

  const res = (await queryRes.json()) as {
    data: { chain: number; address: `0x${string}` }[]
  }

  return res.data
}

export async function insertERC20Tokens(client: ClickHouseClient, tokens: Token[]) {
  const values = toTokenStorage(tokens)

  if (values.length === 0) {
    return
  }

  await client.insert({
    table: 'evm_indexer.tokens',
    values,
    format: 'JSONEachRow',
  })

  // merge duplicates
  await client.command({
    query: 'OPTIMIZE TABLE evm_indexer.tokens FINAL DEDUPLICATE;',
  })
}
