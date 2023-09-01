import type { ClickHouseClient } from '@clickhouse/client'
import { groupBy } from '@lib/array'
import type { Category } from '@lib/category'
import { type Chain, chainByChainId, chainById } from '@lib/chains'
import { fromDateTime, toDateTime, unixFromDateTime } from '@lib/fmt'
import { avg, sum } from '@lib/math'

export interface Balance {
  chain: Chain
  adapterId: string
  fromAddress: string
  address: string
  category: Category
  groupIdx: number
  amount: string
  price: number
  balanceUSD: number
  rewardUSD: number
  debtUSD: number
  healthFactor: number
  timestamp: Date
  data?: any
}

export interface BalanceStorage {
  chain: number
  adapter_id: string
  from_address: string
  address: string
  category: Category
  group_idx: number
  amount: string
  price: string
  balance_usd: string
  reward_usd: string
  debt_usd: string
  health_factor: string
  timestamp: string
  data: string
}

export interface BalanceStorable {
  chain: number
  adapter_id: string
  from_address: string
  address: string
  category: Category
  group_idx: number
  amount: bigint | string
  price: number
  balance_usd: number
  reward_usd: number
  debt_usd: number
  health_factor: number
  timestamp: string
  data: string
}

export function fromStorage(balancesStorage: BalanceStorage[]) {
  const balances: Balance[] = []

  for (const balanceStorage of balancesStorage) {
    const chain = chainByChainId[balanceStorage.chain]?.id
    if (chain == null) {
      console.error(`Missing chain ${balanceStorage.chain}`)
      continue
    }

    const balance: Balance = {
      ...JSON.parse(balanceStorage.data),
      chain,
      adapterId: balanceStorage.adapter_id,
      fromAddress: balanceStorage.from_address,
      address: balanceStorage.address,
      category: balanceStorage.category,
      groupIdx: balanceStorage.group_idx,
      amount: balanceStorage.amount,
      price: parseFloat(balanceStorage.price),
      balanceUSD: parseFloat(balanceStorage.balance_usd),
      rewardUSD: parseFloat(balanceStorage.reward_usd),
      debtUSD: parseFloat(balanceStorage.debt_usd),
      healthFactor: parseFloat(balanceStorage.health_factor),
      timestamp: fromDateTime(balanceStorage.timestamp),
    }

    balances.push(balance)
  }

  return balances
}

export function toStorage(balances: Balance[]) {
  const balancesStorable: BalanceStorable[] = []

  for (const balance of balances) {
    const {
      chain,
      adapterId,
      fromAddress,
      address,
      category,
      groupIdx,
      amount,
      price,
      balanceUSD,
      rewardUSD,
      debtUSD,
      healthFactor,
      timestamp,
      ...data
    } = balance

    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    const balanceStorable: BalanceStorable = {
      chain: chainId,
      adapter_id: adapterId,
      from_address: fromAddress,
      address,
      category,
      group_idx: groupIdx,
      amount,
      price: price || 0,
      balance_usd: balanceUSD || 0,
      reward_usd: rewardUSD || 0,
      debt_usd: debtUSD || 0,
      health_factor: healthFactor || 0,
      timestamp: toDateTime(timestamp),
      data: JSON.stringify(data),
    }

    balancesStorable.push(balanceStorable)
  }

  return balancesStorable
}

export async function selectLatestBalancesSnapshotByFromAddress(client: ClickHouseClient, fromAddress: string) {
  const queryRes = await client.query({
    query: `
      WITH (
        SELECT max("timestamp") as "timestamp"
        FROM lf.balances
        WHERE from_address = {fromAddress: String}
      ) AS latest
      SELECT "chain", sum("balance_usd") as "balance_usd", sum("debt_usd") as "debt_usd", sum("reward_usd") as "reward_usd", max("timestamp") as "last_timestamp"
      FROM lf.balances
      WHERE from_address = {fromAddress: String} AND timestamp IN latest
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
      WITH (
        SELECT max("timestamp") as "timestamp"
        FROM lf.balances
        WHERE from_address = {fromAddress: String}
      ) AS latest
      SELECT *
      FROM lf.balances
      WHERE from_address = {fromAddress: String} AND timestamp IN latest;
    `,
    query_params: {
      fromAddress: fromAddress.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: BalanceStorage[]
  }

  const balancesByChain = groupBy(fromStorage(res.data), 'chain')

  for (const chain in balancesByChain) {
    const balancesByAdapterId = groupBy(balancesByChain[chain], 'adapterId')

    for (const adapterId in balancesByAdapterId) {
      const balancesByGroupIdx = groupBy(balancesByAdapterId[adapterId], 'groupIdx')

      for (const groupIdx in balancesByGroupIdx) {
        const balances = balancesByGroupIdx[groupIdx]

        balancesGroups.push({
          adapterId,
          chain,
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
  }

  return balancesGroups
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
    table: 'lf.balances',
    values,
    format: 'JSONEachRow',
  })
}
