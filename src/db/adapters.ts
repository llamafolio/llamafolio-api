import { sliceIntoChunks } from '@lib/array'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface Adapter {
  id: string
  chain: Chain
  contractsExpireAt?: Date
}

export interface AdapterStorage {
  id: string
  chain: string
  contracts_expire_at: string | null
}

export interface AdapterStorable {
  id: string
  chain: Chain
  contracts_expire_at?: Date
}

export function fromStorage(adaptersStorage: AdapterStorage[]) {
  const adapters: Adapter[] = []

  for (const adapterStorage of adaptersStorage) {
    const adapter: Adapter = {
      id: adapterStorage.id,
      chain: adapterStorage.chain as Chain,
      contractsExpireAt: adapterStorage.contracts_expire_at ? new Date(adapterStorage.contracts_expire_at) : undefined,
    }

    adapters.push(adapter)
  }

  return adapters
}

export function toRow(adapterStorable: AdapterStorable) {
  return [adapterStorable.id, adapterStorable.chain, adapterStorable.contracts_expire_at]
}

export function toStorage(adapters: Adapter[]) {
  const adaptersStorable: AdapterStorable[] = []

  for (const adapter of adapters) {
    const { id, chain, contractsExpireAt } = adapter

    const adapterStorable: AdapterStorable = {
      id,
      chain,
      contracts_expire_at: contractsExpireAt,
    }

    adaptersStorable.push(adapterStorable)
  }

  return adaptersStorable
}

export async function selectDistinctIdAdapters(client: PoolClient) {
  const adaptersRes = await client.query(`select distinct(id), * from adapters;`, [])

  return fromStorage(adaptersRes.rows)
}

export async function selectAdaptersContractsExpired(client: PoolClient) {
  const adaptersRes = await client.query(`select * from adapters where contracts_expire_at <= now();`, [])

  return fromStorage(adaptersRes.rows)
}

export function insertAdapters(client: PoolClient, adapters: Adapter[]) {
  const values = toStorage(adapters).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format('INSERT INTO adapters (id, chain, contracts_expire_at) VALUES %L ON CONFLICT DO NOTHING;', chunk),
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
