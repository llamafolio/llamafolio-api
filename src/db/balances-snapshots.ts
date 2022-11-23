import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface BalancesSnapshot {
  fromAddress: string
  adapterId: string
  chain: Chain
  balanceUSD: number
  timestamp: Date
  metadata?: object
}

export interface BalancesSnapshotStorage {
  from_address: Buffer
  adapter_id: string
  chain: string
  balance_usd: string
  timestamp: string
  metadata?: object
}

export interface BalancesSnapshotStorable {
  from_address: Buffer
  adapter_id: string
  chain: Chain
  balance_usd: number
  timestamp: Date
  metadata?: object
}

export function fromStorage(balancesSnapshotsStorage: BalancesSnapshotStorage[]) {
  const balancesSnapshots: BalancesSnapshot[] = []

  for (const balancesSnapshotStorage of balancesSnapshotsStorage) {
    const balancesSnapshot: BalancesSnapshot = {
      fromAddress: bufToStr(balancesSnapshotStorage.from_address),
      adapterId: balancesSnapshotStorage.adapter_id,
      chain: balancesSnapshotStorage.chain as Chain,
      balanceUSD: parseFloat(balancesSnapshotStorage.balance_usd),
      timestamp: new Date(balancesSnapshotStorage.timestamp),
      metadata: balancesSnapshotStorage.metadata,
    }

    balancesSnapshots.push(balancesSnapshot)
  }

  return balancesSnapshots
}

export function toRow(snapshot: BalancesSnapshotStorable) {
  return [
    snapshot.from_address,
    snapshot.adapter_id,
    snapshot.chain,
    snapshot.balance_usd,
    snapshot.timestamp,
    snapshot.metadata,
  ]
}

export function toStorage(balancesSnapshots: BalancesSnapshot[]) {
  const balancesSnapshotsStorable: BalancesSnapshotStorable[] = []

  for (const balanceSnapshot of balancesSnapshots) {
    const { fromAddress, adapterId, chain, balanceUSD, timestamp, metadata } = balanceSnapshot

    const balancesSnapshotStorable: BalancesSnapshotStorable = {
      from_address: strToBuf(fromAddress),
      chain,
      adapter_id: adapterId,
      balance_usd: balanceUSD,
      timestamp: new Date(timestamp),
      // \\u0000 cannot be converted to text
      metadata: JSON.parse(JSON.stringify(metadata).replace(/\\u0000/g, '')),
    }

    balancesSnapshotsStorable.push(balancesSnapshotStorable)
  }

  return balancesSnapshotsStorable
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
          'INSERT INTO balances_snapshots (from_address, adapter_id, chain, balance_usd, timestamp, data) VALUES %L ON CONFLICT DO NOTHING;',
          chunk,
        ),
        [],
      ),
    ),
  )
}
