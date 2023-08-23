import type { ClickHouseClient } from '@clickhouse/client'
import { fromDateTime } from '@lib/fmt'

export interface Label {
  address: string
  type: string
  value: string
  updatedAt: Date
}

export interface LabelStorage {
  address: string
  type: string
  value: string
  updated_at: string
}

export function fromStorage(labelsStorage: LabelStorage[]) {
  const labels: Label[] = []

  for (const labelStorage of labelsStorage) {
    const label: Label = {
      address: labelStorage.address,
      type: labelStorage.type,
      value: labelStorage.value,
      updatedAt: fromDateTime(labelStorage.updated_at),
    }

    labels.push(label)
  }

  return labels
}

export async function selectLabelsByAddresses(client: ClickHouseClient, addresses: string[]) {
  const queryRes = await client.query({
    query: 'SELECT * FROM lf.labels WHERE "address" IN {addresses: Array(String)};',
    query_params: {
      addresses,
    },
  })

  const res = (await queryRes.json()) as {
    data: LabelStorage[]
  }

  return res.data
}
