import type { ClickHouseClient } from '@clickhouse/client'
import type { Balance } from '@lib/adapter'
import { groupBy, groupBy2 } from '@lib/array'
import { type Chain, chainByChainId, chainById } from '@lib/chains'
import { toDateTime, unixFromDateTime } from '@lib/fmt'
import { avg, sum } from '@lib/math'

export type BalanceStorable = Balance & {
  groupIdx: number
  adapterId: string
  timestamp: Date
  healthFactor: number
  fromAddress: string
}

export interface AdapterBalances {
  chain: Chain
  adapterId: string
  fromAddress: string
  address: string
  balanceUSD: number
  rewardUSD: number
  debtUSD: number
  timestamp: Date
  balances: any[]
}

export interface AdapterBalancesStorage {
  chain: number
  adapter_id: string
  from_address: string
  address: string
  balance_usd: string
  reward_usd: string
  debt_usd: string
  timestamp: string
  balances: string[]
}

export interface AdapterBalancesStorable {
  chain: number
  adapter_id: string
  from_address: string
  balance_usd: number
  reward_usd: number
  debt_usd: number
  timestamp: string
  balances: string[]
}

export function toStorage(balances: Balance[]) {
  const adaptersBalancesStorable: AdapterBalancesStorable[] = []

  const balancesByChainByAdapterId = groupBy2(balances, 'chain', 'adapterId')

  for (const chain in balancesByChainByAdapterId) {
    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    for (const adapterId in balancesByChainByAdapterId[chain]) {
      let balance_usd = 0
      let debt_usd = 0
      let reward_usd = 0

      const balances = balancesByChainByAdapterId[chain][adapterId].map((balance) => {
        const {
          chain: _chain,
          adapterId: _adapterId,
          fromAddress: _fromAddress,
          address,
          category,
          groupIdx,
          amount,
          price,
          balanceUSD,
          rewardUSD,
          debtUSD,
          healthFactor,
          timestamp: _timestamp,
          ...data
        } = balance

        balance_usd += balanceUSD || 0
        debt_usd += debtUSD || 0
        reward_usd += rewardUSD || 0

        return JSON.stringify({
          ...data,
          address,
          category,
          group_idx: groupIdx,
          amount,
          price: price || 0,
          balance_usd: balanceUSD || 0,
          reward_usd: rewardUSD || 0,
          debt_usd: debtUSD || 0,
          health_factor: healthFactor || 0,
        })
      })

      const adapterBalancesStorable: AdapterBalancesStorable = {
        adapter_id: adapterId,
        chain: chainId,
        from_address: balancesByChainByAdapterId[chain][adapterId][0].fromAddress,
        timestamp: toDateTime(balancesByChainByAdapterId[chain][adapterId][0].timestamp),
        balance_usd,
        debt_usd,
        reward_usd,
        balances,
      }

      adaptersBalancesStorable.push(adapterBalancesStorable)
    }
  }

  return adaptersBalancesStorable
}

export async function selectLatestBalancesSnapshotByFromAddress(client: ClickHouseClient, fromAddress: string) {
  const queryRes = await client.query({
    query: `
      SELECT "chain", sum("balance_usd") as "balance_usd", sum("debt_usd") as "debt_usd", sum("reward_usd") as "reward_usd", max("timestamp") as "last_timestamp"
      FROM lf.adapters_balances
      WHERE
        from_address = {fromAddress: String} AND
        toStartOfDay("timestamp") = (SELECT max(toStartOfDay(timestamp)) AS "timestamp" FROM lf.adapters_balances WHERE from_address = {fromAddress: String})
      GROUP BY "chain";
    `,
    query_params: {
      fromAddress: fromAddress.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: { chain: string; balance_usd: string; debt_usd: string; reward_usd: string; last_timestamp: string }[]
  }

  if (res.data.length === 0) {
    return {
      balanceUSD: 0,
      debtUSD: 0,
      rewardUSD: 0,
      chains: [],
    }
  }

  const chains = res.data.map((row) => ({
    id: chainByChainId[parseInt(row.chain)]?.id,
    balanceUSD: parseFloat(row.balance_usd),
    debtUSD: parseFloat(row.debt_usd),
    rewardUSD: parseFloat(row.reward_usd),
  }))

  return {
    balanceUSD: sum(chains.map((chain) => chain.balanceUSD)),
    debtUSD: sum(chains.map((chain) => chain.debtUSD)),
    rewardUSD: sum(chains.map((chain) => chain.rewardUSD)),
    chains,
    updatedAt: unixFromDateTime(res.data[0].last_timestamp),
  }
}

export async function selectLatestBalancesGroupsByFromAddress(client: ClickHouseClient, fromAddress: string) {
  const balancesGroups: any[] = []

  const queryRes = await client.query({
    query: `
      SELECT * FROM lf.adapters_balances
      WHERE
        from_address = {fromAddress: String} AND
        toStartOfDay("timestamp") = (SELECT max(toStartOfDay(timestamp)) AS "timestamp" FROM lf.adapters_balances WHERE from_address = {fromAddress: String});
    `,
    query_params: {
      fromAddress: fromAddress.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: AdapterBalancesStorage[]
  }

  let updatedAt = undefined

  for (const adapterBalance of res.data) {
    const chain = chainByChainId[adapterBalance.chain]?.id
    if (chain == null) {
      console.error(`Missing chain ${adapterBalance.chain}`)
      continue
    }

    if (!updatedAt) {
      updatedAt = unixFromDateTime(adapterBalance.timestamp)
    }

    const balances = adapterBalance.balances.map((raw) => {
      const balance = JSON.parse(raw)

      return {
        ...balance,
        groupIdx: balance.group_idx,
        balanceUSD: parseFloat(balance.balance_usd),
        debtUSD: parseFloat(balance.debt_usd),
        rewardUSD: parseFloat(balance.reward_usd),
        healthFactor: parseFloat(balance.health_factor),
      }
    })

    const balancesByGroupIdx = groupBy(balances, 'groupIdx')

    for (const groupIdx in balancesByGroupIdx) {
      const balances = balancesByGroupIdx[groupIdx]

      balancesGroups.push({
        adapterId: adapterBalance.adapter_id,
        chain: adapterBalance.chain,
        balanceUSD: sum(balances.map((balance) => balance.balanceUSD)),
        debtUSD: sum(balances.map((balance) => balance.debtUSD)),
        rewardUSD: sum(balances.map((balance) => balance.rewardUSD)),
        healthFactor: avg(
          balances.map((balance) => balance.healthFactor),
          balances.length,
        ),
        timestamp: balances[0]?.timestamp,
        balances,
      })
    }
  }

  return { updatedAt, balancesGroups }
}

export async function selectBalancesHolders(
  _client: ClickHouseClient,
  _contractAddress: string,
  _chain: Chain,
  _limit: number,
) {
  console.error('Unimplemented function db/balances#selectBalancesHolders')
  return []
}

export function insertBalances(client: ClickHouseClient, balances: Balance[]) {
  const values = toStorage(balances)

  if (values.length === 0) {
    return
  }

  return client.insert({
    table: 'lf.adapters_balances',
    values,
    format: 'JSONEachRow',
  })
}
