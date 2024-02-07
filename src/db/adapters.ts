import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import type { Contract } from '@lib/adapter'
import { type Chain, chainByChainId, chainById } from '@lib/chains'
import { fromDateTime, toDateTime } from '@lib/fmt'
import { isNotFalsy, isNotNullish } from '@lib/type'

export interface Adapter {
  id: string
  parentId: string
  chain: Chain
  contractsExpireAt?: Date
  contractsRevalidateProps?: { [key: string]: any }
  createdAt: Date
  updatedAt: Date
  version: number
  sign: number
}

export interface AdapterStorage {
  id: string
  parent_id: string
  chain: string
  contracts_expire_at: string | null
  contracts_revalidate_props: string | null
  created_at: string
  updated_at: string
  version: number
  sign: number
}

export interface AdapterStorable {
  id: string
  parent_id: string
  chain: number
  contracts_expire_at?: string
  contracts_revalidate_props?: string
  created_at?: string
  updated_at?: string
  version: number
  sign: number
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
      parentId: adapterStorage.parent_id,
      chain: chain.id,
      contractsExpireAt: adapterStorage.contracts_expire_at
        ? fromDateTime(adapterStorage.contracts_expire_at)
        : undefined,
      contractsRevalidateProps: adapterStorage.contracts_revalidate_props
        ? JSON.parse(adapterStorage.contracts_revalidate_props)
        : undefined,
      createdAt: fromDateTime(adapterStorage.created_at),
      updatedAt: fromDateTime(adapterStorage.updated_at),
      version: adapterStorage.version,
      sign: adapterStorage.sign,
    }

    adapters.push(adapter)
  }

  return adapters
}

export function toStorage(adapters: Adapter[]) {
  const adaptersStorable: AdapterStorable[] = []

  for (const adapter of adapters) {
    const { id, parentId, chain, contractsExpireAt, contractsRevalidateProps, createdAt, updatedAt, version, sign } =
      adapter

    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    const adapterStorable: AdapterStorable = {
      id,
      parent_id: parentId,
      chain: chainId,
      contracts_expire_at: contractsExpireAt ? toDateTime(contractsExpireAt) : undefined,
      contracts_revalidate_props: contractsRevalidateProps ? JSON.stringify(contractsRevalidateProps) : undefined,
      created_at: toDateTime(createdAt),
      updated_at: toDateTime(updatedAt),
      version,
      sign,
    }

    adaptersStorable.push(adapterStorable)
  }

  return adaptersStorable
}

export async function countAdapters(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: `
      SELECT
        count() AS "count"
      FROM (
        SELECT "id" FROM ${environment.NS_LF}.adapters
        GROUP BY "id"
        HAVING sum("sign") > 0
      );
    `,
  })

  const res = (await queryRes.json()) as {
    data: [{ count: string }]
  }

  return parseInt(res.data[0].count)
}

export async function selectAdapter(client: ClickHouseClient, adapterId: string, chainId: number) {
  const queryRes = await client.query({
    query: `SELECT * FROM ${environment.NS_LF}.adapters FINAL WHERE "chain" = {chainId: UInt64} AND "id" = {adapterId: String};`,
    query_params: { chainId, adapterId },
  })

  const res = (await queryRes.json()) as {
    data: AdapterStorage[]
  }

  return res.data.length === 1 ? fromStorage(res.data)[0] : null
}

export async function selectDistinctAdaptersIds(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: `
      SELECT "id" FROM ${environment.NS_LF}.adapters
      GROUP BY "id"
      HAVING sum("sign") > 0;
    `,
  })

  const res = (await queryRes.json()) as {
    data: { id: string }[]
  }

  return res.data
}

export async function selectDistinctAdaptersChains(client: ClickHouseClient) {
  const adaptersChains: { [key: string]: Set<Chain> } = {}
  const adapters: { [key: string]: Chain[] } = {}

  const queryRes = await client.query({
    query: `
      SELECT
        "id",
        "parent_id",
        groupUniqArray("chain") AS "chains"
      FROM ${environment.NS_LF}.adapters
      GROUP BY "id", "parent_id"
      HAVING sum("sign") > 0
    `,
  })

  const res = (await queryRes.json()) as {
    data: { id: string; parent_id: string; chains: string[] }[]
  }

  for (const row of res.data) {
    const chains = row.chains.map((chainIdStr) => chainByChainId[parseInt(chainIdStr)]?.id).filter(isNotNullish)
    if (!adaptersChains[row.id]) {
      adaptersChains[row.id] = new Set()
    }

    if (!adaptersChains[row.parent_id]) {
      adaptersChains[row.parent_id] = new Set()
    }

    for (const chain of chains) {
      adaptersChains[row.id].add(chain)
      adaptersChains[row.parent_id].add(chain)
    }
  }

  for (const adapter in adaptersChains) {
    adapters[adapter] = [...adaptersChains[adapter]]
  }

  return adapters
}

export async function selectAdaptersContractsExpired(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: `
      SELECT "id", "chain"
      FROM ${environment.NS_LF}.adapters
      WHERE contracts_expire_at <= now()
      GROUP BY "id", "chain"
      HAVING sum("sign") > 0;`,
  })

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
        groupUniqArray("chain") AS "chains",
        max("created_at") AS "created_at"
      FROM lf.adapters
      WHERE "id" <> 'wallet'
      AND "id" IN (
        SELECT "slug" FROM lf.protocols GROUP BY "slug"
      )
      GROUP BY "id"
      HAVING sum("sign") > 0
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

export async function selectNonDuplicateAdaptersContracts(
  client: ClickHouseClient,
  adapterId: string,
  chainId: number,
  adaptersContracts: Contract[],
) {
  const queryRes = await client.query({
    query: `
      SELECT
        "address",
        "token"
      FROM ${environment.NS_LF}.adapters_contracts
      WHERE
        "chain" = {chainId: UInt64} AND
        "adapter_id" = {adapterId: String} AND
        ("address", "token") IN (
          SELECT
              x[1] AS "address",
              x[2] AS "token"
          FROM (
              SELECT arrayJoin({values: Array(Array(String))}) AS "x"
          )
      )
      GROUP BY "address", "token"
      HAVING sum("sign") > 0;
    `,
    query_params: {
      chainId,
      adapterId,
      values: adaptersContracts.map((contract) => [
        contract.address.toLowerCase(),
        (contract.token || '').toLowerCase(),
      ]),
    },
  })

  const res = (await queryRes.json()) as {
    data: { address: string; token: string }[]
  }

  // Return filtered contracts containing only NEW values (not already inserted)
  return adaptersContracts.filter(
    (contract) =>
      !res.data.some(
        (c) => contract.address.toLowerCase() === c.address && (contract.token || '').toLowerCase() === c.token,
      ),
  )
}

export async function insertAdapters(client: ClickHouseClient, adapters: Adapter[]) {
  const values = toStorage(adapters)

  if (values.length === 0) {
    return
  }

  return client.insert({
    table: `${environment.NS_LF}.adapters`,
    values,
    format: 'JSONEachRow',
  })
}

export async function deleteAdapterById(client: ClickHouseClient, adapterId: string, chainId: number) {
  const adapter = await selectAdapter(client, adapterId, chainId)
  if (adapter == null) {
    return
  }

  // Cancel previous state
  return insertAdapters(client, [{ ...adapter, sign: -1 }])
}
