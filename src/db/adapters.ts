import type { ClickHouseClient } from '@clickhouse/client'
import { type Chain, chainByChainId, chainById } from '@lib/chains'
import { fromDateTime, toDateTime } from '@lib/fmt'
import { isNotFalsy } from '@lib/type'

export interface Adapter {
  id: string
  chain: Chain
  contractsExpireAt?: Date
  contractsRevalidateProps?: { [key: string]: any }
  contractsProps?: { [key: string]: any }
  createdAt: Date
  updatedAt: Date
}

export interface AdapterStorage {
  id: string
  chain: string
  contracts_expire_at: string | null
  contracts_revalidate_props: { [key: string]: any } | null
  contracts_props: { [key: string]: any } | null
  created_at: string
  updated_at: string
}

export interface AdapterStorable {
  id: string
  chain: number
  contracts_expire_at?: string
  contracts_revalidate_props?: string
  contracts_props?: string
  created_at?: string
  updated_at?: string
}

export function fromStorage(adaptersStorage: AdapterStorage[]) {
  const adapters: Adapter[] = []

  for (const adapterStorage of adaptersStorage) {
    const chain = chainByChainId[parseInt(adapterStorage.chain)]
    if (!chain) {
      continue
    }

    const adapter: Adapter = {
      id: adapterStorage.id,
      chain: chain.id,
      contractsExpireAt: adapterStorage.contracts_expire_at
        ? fromDateTime(adapterStorage.contracts_expire_at)
        : undefined,
      contractsRevalidateProps: adapterStorage.contracts_revalidate_props || {},
      contractsProps: adapterStorage.contracts_props || {},
      createdAt: fromDateTime(adapterStorage.created_at),
      updatedAt: fromDateTime(adapterStorage.updated_at),
    }

    adapters.push(adapter)
  }

  return adapters
}

export function toStorage(adapters: Adapter[]) {
  const adaptersStorable: AdapterStorable[] = []

  for (const adapter of adapters) {
    const { id, chain, contractsExpireAt, contractsRevalidateProps, contractsProps, createdAt, updatedAt } = adapter

    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    const adapterStorable: AdapterStorable = {
      id,
      chain: chainId,
      contracts_expire_at: contractsExpireAt ? toDateTime(contractsExpireAt) : undefined,
      contracts_revalidate_props: contractsRevalidateProps ? JSON.stringify(contractsRevalidateProps) : undefined,
      contracts_props: contractsProps ? JSON.stringify(contractsProps) : undefined,
      created_at: toDateTime(createdAt),
      updated_at: toDateTime(updatedAt),
    }

    adaptersStorable.push(adapterStorable)
  }

  return adaptersStorable
}

export async function countAdapters(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: 'SELECT count(distinct "id") AS count FROM lf.adapters_last_v;',
  })

  const res = (await queryRes.json()) as {
    data: [{ count: string }]
  }

  return parseInt(res.data[0].count)
}

export async function selectAdapter(client: ClickHouseClient, chainId: number, adapterId: string) {
  const queryRes = await client.query({
    query: 'SELECT * FROM lf.adapters_last_v WHERE "chain" = {chainId: UInt64} AND "id" = {adapterId: String};',
    query_params: { chainId, adapterId },
  })

  const res = (await queryRes.json()) as {
    data: AdapterStorage[]
  }

  return res.data.length === 1 ? fromStorage(res.data)[0] : null
}

export async function selectAdapters(client: ClickHouseClient, chainIds: number[], adapterId: string) {
  const queryRes = await client.query({
    query:
      'SELECT * FROM lf.adapters_last_v WHERE "chain" IN {chainIds: Array(UInt64)} AND "id" = {adapterId: String};',
    query_params: { chainIds, adapterId },
  })

  const res = (await queryRes.json()) as {
    data: AdapterStorage[]
  }

  return fromStorage(res.data)
}

export async function selectDistinctAdaptersIds(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: 'SELECT id FROM lf.adapters_last_v GROUP BY id;',
  })

  const res = (await queryRes.json()) as {
    data: { id: string }[]
  }

  return res.data
}

export async function selectAdaptersContractsExpired(client: ClickHouseClient) {
  const queryRes = await client.query({ query: `SELECT * FROM adapters WHERE contracts_expire_at <= now();` })

  const res = (await queryRes.json()) as {
    data: AdapterStorage[]
  }

  return fromStorage(res.data)
}

export async function selectLatestCreatedAdapters(client: ClickHouseClient, limit = 5) {
  // select last added protocols (no matter which chain) and collect
  // all of their chains we support
  const queryRes = await client.query({
    query: `
      SELECT
        "id",
        groupArray("chain") AS "chains",
        max("created_at") AS "created_at"
      FROM lf.adapters_last_v
      WHERE "id" <> 'wallet'
      AND "id" IN (
        SELECT "slug" FROM lf.protocols
      )
      GROUP BY "id"
      ORDER BY "created_at" DESC
      LIMIT {limit: UInt8};
    `,
    query_params: {
      limit,
    },
  })

  const res = (await queryRes.json()) as {
    data: { id: string; chains: number[]; created_at: string }[]
  }

  return res.data.map((row) => ({
    id: row.id,
    chains: row.chains.map((chainId) => chainByChainId[chainId]?.id).filter(isNotFalsy),
    createdAt: fromDateTime(row.created_at),
  }))
}

export async function insertAdapters(client: ClickHouseClient, adapters: Adapter[]) {
  const values = toStorage(adapters)

  if (values.length === 0) {
    return
  }

  return client.insert({
    table: 'lf.adapters',
    values,
    format: 'JSONEachRow',
  })
}

export function deleteAdapterById(client: ClickHouseClient, adapterId: string) {
  return client.command({
    query: 'DELETE FROM lf.adapters WHERE "id" = {adapterId: String};',
    query_params: { adapterId },
  })
}

export function deleteOldAdapters(client: ClickHouseClient, adapterId: string, chains: number[], timestamp: Date) {
  return client.command({
    query:
      'DELETE FROM lf.adapters WHERE "chain" IN {chains: Array(UInt64)} AND "id" = {adapterId: String} AND "updated_at" < {timestamp: DateTime};',
    query_params: {
      adapterId,
      chains,
      timestamp: toDateTime(timestamp),
    },
    clickhouse_settings: {
      enable_lightweight_delete: 1,
      mutations_sync: '2',
    },
  })
}
