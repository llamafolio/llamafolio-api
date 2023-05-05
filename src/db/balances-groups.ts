import { sliceIntoChunks } from '@lib/array'
import type { Chain } from '@lib/chains'
import type { PoolClient } from 'pg'
import format from 'pg-format'

export interface BalancesGroup {
  id: string
  fromAddress: string
  adapterId: string
  chain: Chain
  balanceUSD: number
  debtUSD?: number | null
  rewardUSD?: number | null
  healthFactor?: number | null
  timestamp: Date
}

export interface BalancesGroupStorage {
  id: string
  from_address: string
  adapter_id: string
  chain: string
  balance_usd: string
  debt_usd: string | null
  reward_usd: string | null
  health_factor: string | null
  timestamp: string
}

export interface BalancesGroupStorable {
  id: string
  from_address: string
  adapter_id: string
  chain: Chain
  balance_usd: number
  debt_usd?: number | null
  reward_usd?: number | null
  health_actor?: number | null
  timestamp: Date
}

export function fromRowStorage(balanceGroupsStorage: BalancesGroupStorage) {
  const balancesGroup: BalancesGroup = {
    id: balanceGroupsStorage.id,
    fromAddress: balanceGroupsStorage.from_address,
    adapterId: balanceGroupsStorage.adapter_id,
    chain: balanceGroupsStorage.chain as Chain,
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
    snapshot.from_address.toLowerCase(),
    snapshot.adapter_id,
    snapshot.chain,
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
    const { id, fromAddress, adapterId, chain, balanceUSD, debtUSD, rewardUSD, healthFactor, timestamp } = balanceGroup

    const balancesGroupStorable: BalancesGroupStorable = {
      id,
      from_address: fromAddress,
      chain,
      adapter_id: adapterId,
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

export async function selectLastBalancesGroupsByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(
    `
    select
      chain,
      sum(balance_usd) as balance_usd,
      sum(debt_usd) as debt_usd,
      sum(reward_usd) as reward_usd,
      timestamp
    from balances_groups
    where from_address = $1
    group by chain, timestamp
    order by balance_usd desc;
  `,
    [fromAddress],
  )

  return balancesRes.rows.map((row) => ({
    timestamp: row.timestamp,
    chain: row.chain,
    balanceUSD: parseFloat(row.balance_usd),
    debtUSD: parseFloat(row.debt_usd),
    rewardUSD: parseFloat(row.reward_usd),
  }))
}

export function deleteBalancesGroupsCascadeByFromAddress(client: PoolClient, fromAddress: string) {
  return client.query(
    `
    WITH balances_groups_ids AS (
      DELETE FROM balances_groups WHERE from_address = $1 RETURNING id
    )
    DELETE FROM balances WHERE group_id IN (SELECT id FROM balances_groups_ids)
    `,
    [fromAddress],
  )
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
