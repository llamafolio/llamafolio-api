import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface BalancesSnapshot {
  fromAddress: string
  adapterId: string
  balanceUSD: number
  timestamp: Date
  metadata: object
}

export interface BalancesSnapshotStorage {
  from_address: Buffer
  adapter_id: string
  balance_usd: string
  timestamp: string
  metadata: object
}

export interface BalancesSnapshotStorable {
  from_address: Buffer
  adapter_id: string
  balance_usd: number
  timestamp: Date
  metadata: object
}

export function fromStorage(balancesSnapshots: BalancesSnapshotStorage[]) {
  const res: BalancesSnapshot[] = []

  for (const snapshot of balancesSnapshots) {
    const c: BalancesSnapshot = {
      fromAddress: bufToStr(snapshot.from_address),
      adapterId: snapshot.adapter_id,
      balanceUSD: parseFloat(snapshot.balance_usd),
      timestamp: new Date(snapshot.timestamp),
      metadata: snapshot.metadata,
    }

    res.push(c)
  }

  return res
}

export function toRow(snapshot: BalancesSnapshotStorable) {
  return [snapshot.from_address, snapshot.adapter_id, snapshot.balance_usd, snapshot.timestamp, snapshot.metadata]
}

export function toStorage(balancesSnapshots: BalancesSnapshot[]) {
  const res: BalancesSnapshotStorable[] = []

  for (const snapshot of balancesSnapshots) {
    const { fromAddress, adapterId, balanceUSD, timestamp, metadata } = snapshot

    const c = {
      from_address: strToBuf(fromAddress),
      adapter_id: adapterId,
      balance_usd: balanceUSD,
      timestamp: new Date(timestamp),
      // \\u0000 cannot be converted to text
      metadata: JSON.parse(JSON.stringify(metadata).replace(/\\u0000/g, '')),
    }

    res.push(c)
  }

  return res
}

export async function selectBalancesSnapshotsByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(`select * from balances_snapshots where from_address = $1::bytea;`, [
    strToBuf(fromAddress),
  ])

  return fromStorage(balancesRes.rows)
}

export function insertBalancesSnapshots(client: PoolClient, balancesSnapshot: BalancesSnapshot[]) {
  const values = toStorage(balancesSnapshot).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          'INSERT INTO balances_snapshots (from_address, adapter_id, balance_usd, timestamp, data) VALUES %L ON CONFLICT DO NOTHING;',
          chunk,
        ),
        [],
      ),
    ),
  )
}
