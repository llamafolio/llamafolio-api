import type { ClickHouseClient } from '@clickhouse/client'
import { bufToStr, strToBuf } from '@lib/buf'
import type { PoolClient } from 'pg'
import format from 'pg-format'

export interface Label {
  address: string
  type: string
  value: string
  updatedAt: Date
}

export interface LabelStorage {
  address: Buffer
  type: string
  value: string
  updated_at: string
}

export interface LabelStorable {
  address: Buffer
  type: string
  value: string
  updated_at: Date
}

export function fromStorage(labelsStorage: LabelStorage[]) {
  const labels: Label[] = []

  for (const labelStorage of labelsStorage) {
    const label: Label = {
      address: bufToStr(labelStorage.address),
      type: labelStorage.type,
      value: labelStorage.value,
      updatedAt: new Date(labelStorage.updated_at),
    }

    labels.push(label)
  }

  return labels
}

export async function selectLabelsByAddresses(client: PoolClient, addresses: string[]) {
  const labelsRes = await client.query(format(`select * from labels where address in %L;`, [addresses.map(strToBuf)]))

  return fromStorage(labelsRes.rows)
}

export async function selectLabelsByAddressesV1(client: ClickHouseClient, addresses: string[]) {
  const queryRes = await client.query({
    query: 'select * from labels where address in {addresses: Array(String)};',
    query_params: {
      addresses,
    },
  })

  const res = (await queryRes.json()) as {
    data: LabelStorage[]
  }

  return res.data
}
