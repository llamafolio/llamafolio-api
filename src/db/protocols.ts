import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import type { Category } from '@lib/category'
import { isDateTimeNullish, unixFromDateTime } from '@lib/fmt'
import type { IProtocol } from '@lib/protocols'

export interface ProtocolStorage {
  name: string
  url: string
  logo: string
  category: string
  slug: string
  parent_slug?: string
  chain: string
  chains: string[]
  symbol: string | null
  tvl: string
  twitter: string | null
  description: string | null
  address: string | null
}

export function fromRowStorage(protocolStorage: ProtocolStorage) {
  const protocol: IProtocol = {
    name: protocolStorage.name,
    url: protocolStorage.url,
    logo: protocolStorage.logo,
    category: protocolStorage.category,
    slug: protocolStorage.slug,
    parent_slug: protocolStorage.parent_slug,
    chain: protocolStorage.chain,
    chains: protocolStorage.chains,
    symbol: protocolStorage.symbol || undefined,
    tvl: protocolStorage.tvl != null ? parseFloat(protocolStorage.tvl) : 0,
    twitter: protocolStorage.twitter || undefined,
    description: protocolStorage.description || undefined,
    address: protocolStorage.address || undefined,
  }

  return protocol
}

export function fromStorage(protocolsStorage: ProtocolStorage[]) {
  return protocolsStorage.map(fromRowStorage)
}

export async function selectProtocols(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: 'SELECT * FROM lf.protocols FINAL;',
  })

  const res = (await queryRes.json()) as {
    data: ProtocolStorage[]
  }

  return fromStorage(res.data)
}

export async function selectProtocolContracts(
  client: ClickHouseClient,
  protocol: string,
  category?: Category,
  chainId?: number,
  limit = 10,
  offset = 0,
) {
  const queryRes = await client.query({
    query: `
      WITH "contracts" AS (
        SELECT
          "chain",
          "address",
          "name",
          "token",
          JSONExtractString("data", 'symbol') AS "symbol",
          JSONExtractString("data", 'decimals') AS "decimals",
          arrayMap(x -> (
            JSONExtractString(x, 'address'),
            JSONExtractString(x, 'symbol'),
            JSONExtractString(x, 'decimals')
          ), JSONExtractArrayRaw("data", 'underlyings')) AS "underlyings",
          arrayMap(x -> (
            JSONExtractString(x, 'address'),
            JSONExtractString(x, 'symbol'),
            JSONExtractString(x, 'decimals')
          ), JSONExtractArrayRaw("data", 'rewards')) AS "rewards"
        FROM ${environment.NS_LF}.adapters_contracts
        WHERE
          ${chainId ? '"chain" = {chainId: UInt64} AND' : ''}
          "adapter_id" = {adapterId: String}
          ${category ? ' AND "category" = {category: String}' : ''}
        GROUP BY "chain", "address", "name", "token", "symbol", "decimals", "underlyings", "rewards"
        HAVING sum("sign") > 0
      ),
      (
        SELECT count() AS "count" FROM "contracts"
      ) AS "count"
      SELECT
        *,
        "count"
      FROM "contracts"
      LIMIT {limit: UInt8}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      chainId,
      limit,
      offset,
      category,
      adapterId: protocol,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      address: string
      name: string
      token: string
      symbol: string
      decimals: string
      underlyings: [string, string, string][]
      rewards: [string, string, string][]
      count: string
    }[]
  }

  return res.data
}

export async function selectProtocolBalancesSnapshotsStatus(
  client: ClickHouseClient,
  adapterId: string,
  chainId: number,
) {
  const queryRes = await client.query({
    query: `
      SELECT
        argMax("timestamp", "version") AS "latest_timestamp",
        max("version") AS "latest_version"
      FROM lf.adapters_balances_snapshots_status
      WHERE
        "chain" = {chainId: UInt64} AND
        "adapterId" = {adapterId: String}
    `,
    query_params: {
      chainId,
      adapterId,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      latest_timestamp: string
      latest_version: string
    }[]
  }

  if (res.data.length === 0 || isDateTimeNullish(res.data[0].latest_timestamp)) {
    return null
  }

  return {
    timestamp: unixFromDateTime(res.data[0].latest_timestamp),
    version: parseInt(res.data[0].latest_version),
  }
}

export async function selectProtocolHoldersBalances(
  client: ClickHouseClient,
  adapterId: string,
  chainId: number,
  limit: number,
  offset: number,
) {
  const queryRes = await client.query({
    query: `
      WITH (
        SELECT
          sum("balanceUSD") - sum("debtUSD") AS "netBalanceUSD"
        FROM lf.adapters_balances_snapshots
        WHERE
          "chain" = {chainId: UInt64} AND
          "adapterId" = {adapterId: String} AND
          (toStartOfDay("timestamp"), "version") = (
            SELECT
              argMax("timestamp", "version"),
              max("version")
              FROM lf.adapters_balances_snapshots_status
              WHERE
                "chain" = {chainId: UInt64} AND
                "adapterId" = {adapterId: String}
          )
        GROUP BY "chain", "adapterId"
      ) AS "totalNetBalanceUSD"
      SELECT
        "holder",
        sum("balanceUSD") AS "totalBalanceUSD",
        sum("debtUSD") AS "totalDebtUSD",
        "totalBalanceUSD" - "totalDebtUSD" AS "netBalanceUSD",
        "totalNetBalanceUSD",
        "netBalanceUSD" / "totalNetBalanceUSD" AS "share",
        count() over() AS "count",
        toStartOfDay("timestamp") AS "updatedAt"
      FROM lf.adapters_balances_snapshots
      WHERE
        "chain" = {chainId: UInt64} AND
        "adapterId" = {adapterId: String} AND
      ("updatedAt", "version") = (
        SELECT
          argMax("timestamp", "version"),
          max("version")
          FROM lf.adapters_balances_snapshots_status
          WHERE
            "chain" = {chainId: UInt64} AND
            "adapterId" = {adapterId: String}
      )
      GROUP BY "chain", "adapterId", "holder", "updatedAt", "version"
      HAVING "netBalanceUSD" > 0
      ORDER BY "netBalanceUSD" DESC
      LIMIT {limit: UInt8}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      adapterId,
      chainId,
      limit,
      offset,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      holder: string
      totalBalanceUSD: string
      totalDebtUSD: string
      netBalanceUSD: string
      totalNetBalanceUSD: string
      share: string
      count: string
      updatedAt: string
    }[]
  }

  return res.data
}

export async function insertProtocols(client: ClickHouseClient, protocols: IProtocol[]) {
  if (protocols.length === 0) {
    return
  }

  await client.insert({
    table: `${environment.NS_LF}.protocols`,
    values: protocols,
    format: 'JSONEachRow',
  })
}
