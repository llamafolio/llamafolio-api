import { bufToStr, strToBuf } from '@lib/buf'
import { PoolClient } from 'pg'
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
