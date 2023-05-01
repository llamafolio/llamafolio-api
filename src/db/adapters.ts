import { sliceIntoChunks } from '@lib/array'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface Adapter {
  id: string
  chain: Chain
  contractsExpireAt?: Date
  contractsRevalidateProps?: { [key: string]: any }
  contractsProps?: { [key: string]: any }
  createdAt: Date
}

export interface AdapterStorage {
  id: string
  chain: string
  contracts_expire_at: string | null
  contracts_revalidate_props: { [key: string]: any } | null
  contracts_props: { [key: string]: any } | null
  created_at: string
}

export interface AdapterStorable {
  id: string
  chain: Chain
  contracts_expire_at?: Date
  contracts_revalidate_props?: { [key: string]: any }
  contracts_props?: { [key: string]: any }
  created_at?: Date
}

export function fromStorage(adaptersStorage: AdapterStorage[]) {
  const adapters: Adapter[] = []

  for (const adapterStorage of adaptersStorage) {
    const adapter: Adapter = {
      id: adapterStorage.id,
      chain: adapterStorage.chain as Chain,
      contractsExpireAt: adapterStorage.contracts_expire_at ? new Date(adapterStorage.contracts_expire_at) : undefined,
      contractsRevalidateProps: adapterStorage.contracts_revalidate_props || {},
      contractsProps: adapterStorage.contracts_props || {},
      createdAt: new Date(adapterStorage.created_at),
    }

    adapters.push(adapter)
  }

  return adapters
}

export function fromPartialStorage(adaptersStorage: Partial<AdapterStorage>[]) {
  const adapters: Partial<Adapter>[] = []

  for (const adapterStorage of adaptersStorage) {
    const adapter: Partial<Adapter> = {
      id: adapterStorage?.id,
      chain: adapterStorage?.chain as Chain,
      contractsExpireAt: adapterStorage.contracts_expire_at ? new Date(adapterStorage.contracts_expire_at) : undefined,
      contractsRevalidateProps: adapterStorage?.contracts_revalidate_props || {},
      contractsProps: adapterStorage?.contracts_props || {},
      createdAt: adapterStorage.created_at ? new Date(adapterStorage.created_at) : undefined,
    }

    adapters.push(adapter)
  }

  return adapters
}

export function toRow(adapterStorable: AdapterStorable) {
  return [
    adapterStorable.id,
    adapterStorable.chain,
    adapterStorable.contracts_expire_at,
    adapterStorable.contracts_revalidate_props,
    adapterStorable.contracts_props,
    adapterStorable.created_at,
  ]
}

export function toStorage(adapters: Adapter[]) {
  const adaptersStorable: AdapterStorable[] = []

  for (const adapter of adapters) {
    const { id, chain, contractsExpireAt, contractsRevalidateProps, contractsProps, createdAt } = adapter

    const adapterStorable: AdapterStorable = {
      id,
      chain,
      contracts_expire_at: contractsExpireAt,
      contracts_revalidate_props: contractsRevalidateProps,
      contracts_props: contractsProps,
      created_at: createdAt,
    }

    adaptersStorable.push(adapterStorable)
  }

  return adaptersStorable
}

export async function countAdapters(client: PoolClient) {
  const res = await client.query(`select count(distinct(id)) from adapters;`, [])

  return parseInt(res.rows[0].count)
}

export async function selectAdapter(client: PoolClient, chain: Chain, adapterId: string) {
  const adaptersRes = await client.query(`select * from adapters where id = $1 and chain = $2;`, [adapterId, chain])

  return adaptersRes.rows.length === 1 ? fromStorage(adaptersRes.rows)[0] : null
}

export async function selectDistinctAdaptersIds(client: PoolClient) {
  const adaptersRes = await client.query(`select distinct(id) from adapters;`, [])

  return fromStorage(adaptersRes.rows)
}

export async function selectAdaptersContractsExpired(client: PoolClient) {
  const adaptersRes = await client.query(`select * from adapters where contracts_expire_at <= now();`, [])

  return fromStorage(adaptersRes.rows)
}

export async function selectAdapterProps(client: PoolClient, adapterId: string, chain: Chain) {
  const adaptersRes = await client.query(`select contracts_props from adapters where id = $1 and chain = $2;`, [
    adapterId,
    chain,
  ])

  return fromPartialStorage(adaptersRes.rows)[0]
}

/**
 * @param client
 * @param adapters [adapterId, chain] array
 */
export async function selectAdaptersProps(client: PoolClient, adapters: [string, Chain][]) {
  const adaptersRes = await client.query(
    format(
      `select a.id, a.chain, a.contracts_props from adapters a join (values %L) as v (id, chain) on a.id = v.id and a.chain = v.chain;`,
      adapters,
    ),
    [],
  )

  return fromPartialStorage(adaptersRes.rows)
}

export async function selectDefinedAdaptersContractsProps(client: PoolClient) {
  const adaptersRes = await client.query(
    `select id, chain, contracts_props from adapters where contracts_props is not null;`,
    [],
  )

  return fromPartialStorage(adaptersRes.rows) as Pick<Adapter, 'id' | 'chain' | 'contractsProps'>[]
}

export async function selectLatestCreatedAdapters(client: PoolClient, limit = 5) {
  // select x last added protocols (no matter which chain) and collect
  // all of their chains we support
  const adaptersRes = await client.query(
    `
    with last_adapters as (
      select * from (
        select distinct on (a.id) a.id, a.created_at from (
          select distinct id, created_at from adapters
          where id <> 'wallet' and created_at is not null
          order by created_at desc
          limit $2
        ) a
        limit $1
      ) b
      order by b.created_at desc
      )
      select id, array_agg(chain) as chains, created_at from (
        select la.id, a.chain, la.created_at from last_adapters la
        inner join adapters a on a.id = la.id
      ) as _ group by (id, created_at) order by created_at desc;
    `,
    [limit, limit * 2],
  )

  return adaptersRes.rows.map((row) => ({
    id: row.id as string,
    chains: row.chains as Chain[],
    createdAt: new Date(row.created_at),
  }))
}

export function insertAdapters(client: PoolClient, adapters: Adapter[]) {
  const values = toStorage(adapters).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          'INSERT INTO adapters (id, chain, contracts_expire_at, contracts_revalidate_props, contracts_props, created_at) VALUES %L ON CONFLICT DO NOTHING;',
          chunk,
        ),
        [],
      ),
    ),
  )
}

export function upsertAdapters(client: PoolClient, adapters: Adapter[]) {
  const values = toStorage(adapters).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          `
          INSERT INTO adapters (id, chain, contracts_expire_at, contracts_revalidate_props, contracts_props, created_at)
          VALUES %L
          ON CONFLICT (id, chain)
          DO
            UPDATE SET
              contracts_expire_at = EXCLUDED.contracts_expire_at,
              contracts_revalidate_props = EXCLUDED.contracts_revalidate_props,
              contracts_props = EXCLUDED.contracts_props
          ;`,
          chunk,
        ),
        [],
      ),
    ),
  )
}

export function deleteAdapterById(client: PoolClient, adapterId: string) {
  return client.query('DELETE FROM adapters WHERE id = $1;', [adapterId])
}

export function deleteAdapter(client: PoolClient, adapterId: string, chain: Chain) {
  return client.query('DELETE FROM adapters WHERE id = $1 AND chain = $2;', [adapterId, chain])
}
