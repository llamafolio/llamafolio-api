import { Balance, fromRowStorage as fromBalanceRowStorage } from '@db/balances'
import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface BalancesGroup {
  id: string
  fromAddress: string
  adapterId: string
  chain: Chain
  category: Category
  balanceUSD: number
  debtUSD?: number | null
  rewardUSD?: number | null
  healthFactor?: number | null
  timestamp: Date
}

export interface BalancesGroupStorage {
  id: string
  from_address: Buffer
  adapter_id: string
  chain: string
  category: string
  balance_usd: string
  debt_usd: string | null
  reward_usd: string | null
  health_factor: string | null
  timestamp: string
}

export interface BalancesGroupStorable {
  id: string
  from_address: Buffer
  adapter_id: string
  chain: Chain
  category: string
  balance_usd: number
  debt_usd?: number | null
  reward_usd?: number | null
  health_actor?: number | null
  timestamp: Date
}

export function fromRowStorage(balanceGroupsStorage: BalancesGroupStorage) {
  const balancesGroup: BalancesGroup = {
    id: balanceGroupsStorage.id,
    fromAddress: bufToStr(balanceGroupsStorage.from_address),
    adapterId: balanceGroupsStorage.adapter_id,
    chain: balanceGroupsStorage.chain as Chain,
    category: balanceGroupsStorage.category as Category,
    balanceUSD: balanceGroupsStorage.balance_usd != null ? parseFloat(balanceGroupsStorage.balance_usd) : 0,
    debtUSD: balanceGroupsStorage.debt_usd != null ? parseFloat(balanceGroupsStorage.debt_usd) : 0,
    rewardUSD: balanceGroupsStorage.reward_usd != null ? parseFloat(balanceGroupsStorage.reward_usd) : 0,
    healthFactor: balanceGroupsStorage.health_factor != null ? parseFloat(balanceGroupsStorage.health_factor) : null,
    timestamp: new Date(balanceGroupsStorage.timestamp),
  }

  return balancesGroup
}

export function fromStorage(balancesGroupsStorage: BalancesGroupStorage[]) {
  return balancesGroupsStorage.map(fromRowStorage)
}

export function toRow(snapshot: BalancesGroupStorable) {
  return [
    snapshot.id,
    snapshot.from_address,
    snapshot.adapter_id,
    snapshot.chain,
    snapshot.category,
    snapshot.balance_usd,
    snapshot.debt_usd,
    snapshot.reward_usd,
    snapshot.health_actor,
    snapshot.timestamp,
  ]
}

export function toStorage(balancesGroups: BalancesGroup[]) {
  const balanceGroupsStorable: BalancesGroupStorable[] = []

  for (const balanceGroup of balancesGroups) {
    const { id, fromAddress, adapterId, chain, category, balanceUSD, debtUSD, rewardUSD, healthFactor, timestamp } =
      balanceGroup

    const balancesGroupStorable: BalancesGroupStorable = {
      id,
      from_address: strToBuf(fromAddress),
      chain,
      adapter_id: adapterId,
      category,
      balance_usd: balanceUSD,
      debt_usd: debtUSD,
      reward_usd: rewardUSD,
      health_actor: healthFactor,
      timestamp: new Date(timestamp),
    }

    balanceGroupsStorable.push(balancesGroupStorable)
  }

  return balanceGroupsStorable
}

export async function selectBalancesGroupsByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(`select * from balances_groups where from_address = $1::bytea;`, [
    strToBuf(fromAddress),
  ])

  return fromStorage(balancesRes.rows)
}

export async function selectLastBalancesGroupsByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(
    `
  WITH last_balances_group AS (
    SELECT timestamp FROM balances_groups
    WHERE from_address = $1::bytea
    ORDER BY timestamp DESC
    LIMIT 1
  )
  SELECT *
  FROM balances_groups b
  WHERE b.from_address = $1::bytea AND
  b.timestamp IN (SELECT timestamp FROM last_balances_group);
  `,
    [strToBuf(fromAddress)],
  )

  return fromStorage(balancesRes.rows)
}

export async function selectRowsLatestBalancesGroupsWithBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(
    `
    WITH last_balances_group AS (
      SELECT timestamp FROM balances_groups
        WHERE from_address = $1::bytea
        ORDER BY timestamp DESC
        LIMIT 1
    )
    SELECT *
    FROM balances_groups bg
    JOIN balances b ON bg.id = b.group_id
    WHERE bg.from_address = $1::bytea AND
    bg.timestamp IN (SELECT timestamp FROM last_balances_group);
    `,
    [strToBuf(fromAddress)],
  )

  return balancesRes.rows.map((balance) => ({ ...fromRowStorage(balance), ...fromBalanceRowStorage(balance) }))
}

export async function selectLatestBalancesGroupsWithBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(
    `
    WITH last_balances_group AS (
      SELECT timestamp FROM balances_groups
        WHERE from_address = $1::bytea
        ORDER BY timestamp DESC
        LIMIT 1
    )
    SELECT *
    FROM balances_groups bg
    JOIN balances b ON bg.id = b.group_id
    WHERE bg.from_address = $1::bytea AND
    bg.timestamp IN (SELECT timestamp FROM last_balances_group);
    `,
    [strToBuf(fromAddress)],
  )

  const balancesGroupsById: { [key: string]: BalancesGroup & { balances: Balance[] } } = {}

  for (const row of balancesRes.rows) {
    if (!balancesGroupsById[row.id]) {
      balancesGroupsById[row.id] = { ...fromRowStorage(row), balances: [] }
    }
    balancesGroupsById[row.id].balances.push(fromBalanceRowStorage(row))
  }

  return Object.values(balancesGroupsById)
}

export function insertBalancesGroups(client: PoolClient, balancesGroups: BalancesGroup[]) {
  const values = toStorage(balancesGroups).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          `INSERT INTO balances_groups (
            id,
            from_address,
            adapter_id,
            chain,
            category,
            balance_usd,
            debt_usd,
            reward_usd,
            health_factor,
            timestamp
          ) VALUES %L ON CONFLICT DO NOTHING;`,
          chunk,
        ),
        [],
      ),
    ),
  )
}
