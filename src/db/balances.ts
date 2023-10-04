import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import type { Balance, ContractStandard } from '@lib/adapter'
import { groupBy, groupBy2 } from '@lib/array'
import type { Category } from '@lib/category'
import { type Chain, chainByChainId, chainById } from '@lib/chains'
import { toDateTime, unixFromDateTime } from '@lib/fmt'
import { sum } from '@lib/math'

export interface Yield {
  apy?: number
  apyBase?: number
  apyReward?: number
  apyMean30d?: number
  ilRisk?: boolean
}

export interface BaseFormattedBalance extends Yield {
  standard?: ContractStandard
  name?: string
  address: string
  symbol?: string
  decimals?: number
  category: Category
  stable?: boolean
  price?: number
  amount?: string
  balanceUSD?: number
  rewardUSD?: number
  collateralUSD?: number
  debtUSD?: number
  MCR?: number
  collateralFactor?: bigint
  unlockAt?: number
  underlyings?: FormattedBalance[]
  rewards?: FormattedBalance[]
}

export interface PerpFormattedBalance extends BaseFormattedBalance {
  category: 'perpetual'
  side: 'long' | 'short'
  margin: string
  entryPrice: string
  marketPrice: string
  leverage: string
  funding: string
}

type FormattedBalance = BaseFormattedBalance | PerpFormattedBalance

function formatBaseBalance(balance: any) {
  return {
    standard: balance.standard,
    name: balance.name,
    address: balance.address,
    symbol: balance.symbol,
    decimals: balance.decimals,
    category: balance.category as Category,
    stable: balance.stable,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    rewardUSD: balance.rewardUSD,
    collateralUSD: balance.collateralUSD,
    debtUSD: balance.debtUSD,
  }
}

export function formatBalance(balance: any): FormattedBalance {
  const underlyings = balance.underlyings?.map(formatBaseBalance)
  const rewards = balance.rewards?.map(formatBaseBalance)

  const formattedBalance: FormattedBalance = {
    standard: balance.standard,
    name: balance.name,
    address: balance.address,
    symbol: balance.symbol,
    decimals: balance.decimals != null ? parseInt(balance.decimals) : balance.decimals,
    category: balance.category as Category,
    stable: Boolean(balance.stable || underlyings?.every((underlying: any) => underlying.stable)),
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
    rewardUSD: balance.rewardUSD,
    collateralUSD: balance.collateralUSD,
    debtUSD: balance.debtUSD,
    MCR: balance.MCR,
    collateralFactor: balance.collateralFactor,
    apy: balance.apy,
    apyBase: balance.apyBase,
    apyReward: balance.apyReward,
    apyMean30d: balance.apyMean30d,
    ilRisk: balance.ilRisk,
    unlockAt: balance.unlockAt,
    //@ts-expect-error
    side: balance.side,
    margin: balance.margin,
    entryPrice: balance.entryPrice,
    marketPrice: balance.marketPrice,
    leverage: balance.leverage,
    funding: balance.funding,
    underlyings,
    rewards,
  }

  return formattedBalance
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
          __key,
          __key_is_array,
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
    SELECT
      "chain",
      "timestamp",
      sum("balance_usd") as "balance_usd",
      sum("debt_usd") as "debt_usd",
      sum("reward_usd") as "reward_usd"
    FROM lf.adapters_balances
    where from_address = {fromAddress: String}
    GROUP BY "chain", "timestamp"
    ORDER BY "timestamp" DESC
    LIMIT 1 BY "chain"
    `,
    query_params: {
      fromAddress: fromAddress.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: { chain: string; balance_usd: string; debt_usd: string; reward_usd: string; timestamp: string }[]
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
    updatedAt: unixFromDateTime(res.data[0].timestamp),
  }
}

export interface LatestProtocolBalancesGroup {
  balanceUSD: number
  debtUSD?: number
  rewardUSD?: number
  healthFactor?: number
  balances: any[]
}

export interface LatestProtocolBalances {
  id: string
  chain: string
  balanceUSD: number
  debtUSD?: number
  rewardUSD?: number
  healthFactor?: number
  groups: LatestProtocolBalancesGroup[]
}

export async function selectLatestProtocolsBalancesByFromAddress(
  client: ClickHouseClient,
  fromAddress: string,
  timestamp?: Date,
) {
  const protocolsBalances: LatestProtocolBalances[] = []

  const queryRes = await client.query({
    query: `
      SELECT
        ab.chain as chain,
        ab.adapter_id as adapter_id,
        ab.timestamp as timestamp,
        ab.balance as balance,
        y.apy as apy,
        y.apy_base as apy_base,
        y.apy_reward as apy_reward,
        y.apy_mean_30d as apy_mean_30d,
        y.il_risk as il_risk
      FROM (
        SELECT
          chain,
          adapter_id,
          timestamp,
          balances as balance,
          JSONExtractString(balance, 'address') AS address
        FROM ${environment.NS_LF}.adapters_balances
        ARRAY JOIN balances
        WHERE
          from_address = {fromAddress: String} AND
          "timestamp" = ${
            timestamp
              ? '{timestamp: DateTime}'
              : `(SELECT max("timestamp") AS "timestamp" FROM ${environment.NS_LF}.adapters_balances WHERE from_address = {fromAddress: String})`
          }
      ) AS ab
      LEFT JOIN (
        SELECT
          chain,
          adapter_id,
          address,
          apy,
          apy_base,
          apy_reward,
          apy_mean_30d,
          il_risk,
          underlyings
        FROM ${environment.NS_LF}.yields
        WHERE "timestamp" = (SELECT max("timestamp") AS "timestamp" FROM lf.yields)
      ) AS y ON
        (ab.chain = y.chain AND ab.adapter_id = y.adapter_id AND ab.address = y.address);
    `,
    query_params: {
      fromAddress: fromAddress.toLowerCase(),
      timestamp: timestamp ? toDateTime(timestamp) : undefined,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: number
      adapter_id: string
      timestamp: string
      balance: string
      apy: string | null
      apy_base: string | null
      apy_reward: string | null
      apy_mean_30d: string | null
      il_risk: boolean | null
    }[]
  }

  let updatedAt = undefined

  const balancesByChain = groupBy(res.data, 'chain')

  for (const chainId in balancesByChain) {
    const chain = chainByChainId[parseInt(chainId)]?.id
    if (chain == null) {
      console.error(`Missing chain ${chainId}`)
      continue
    }

    if (!updatedAt) {
      updatedAt = unixFromDateTime(balancesByChain[chainId][0].timestamp)
    }

    const balancesByProtocol = groupBy(balancesByChain[chainId], 'adapter_id')

    for (const protocolId in balancesByProtocol) {
      const balances = balancesByProtocol[protocolId].map((row) => {
        const balance = JSON.parse(row.balance)

        return {
          ...balance,
          balanceUSD: parseFloat(balance.balance_usd),
          debtUSD: parseFloat(balance.debt_usd),
          rewardUSD: parseFloat(balance.reward_usd),
          healthFactor: parseFloat(balance.health_factor),
          apy: balance.apy != null ? parseFloat(balance.apy) : undefined,
          apy_base: balance.apy_base != null ? parseFloat(balance.apy_base) : undefined,
          apy_reward: balance.apy_reward != null ? parseFloat(balance.apy_reward) : undefined,
          apy_mean_30d: balance.apy_mean_30d != null ? parseFloat(balance.apy_mean_30d) : undefined,
          il_risk: balance.il_risk != null ? balance.il_risk : undefined,
        }
      })

      const protocolBalances: LatestProtocolBalances = {
        id: protocolId,
        chain,
        balanceUSD: sum(balances.map((balance) => balance.balanceUSD || 0)),
        debtUSD: sum(balances.map((balance) => balance.debtUSD || 0)),
        rewardUSD: sum(balances.map((balance) => balance.rewardUSD || 0)),
        groups: [],
      }

      const balancesByGroupIdx = groupBy(balances, 'group_idx')

      for (const groupIdx in balancesByGroupIdx) {
        const groupBalances = balancesByGroupIdx[groupIdx].map(formatBalance)

        protocolBalances.groups.push({
          balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
          debtUSD: sum(groupBalances.map((balance) => balance.debtUSD || 0)),
          rewardUSD: sum(groupBalances.map((balance) => balance.rewardUSD || 0)),
          healthFactor: balancesByGroupIdx[groupIdx][0].healthFactor,
          balances: groupBalances,
        })
      }

      protocolsBalances.push(protocolBalances)
    }
  }

  return { updatedAt, protocolsBalances }
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
    table: `${environment.NS_LF}.adapters_balances`,
    values,
    format: 'JSONEachRow',
  })
}
