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

export async function selectLabelsByAddress(client: ClickHouseClient, address: string) {
  const queryRes = await client.query({
    query: 'SELECT * FROM lf.labels WHERE "address" = {address: String};',
    query_params: {
      address,
    },
  })

  const res = (await queryRes.json()) as {
    data: LabelStorage[]
  }

  return res.data
}
