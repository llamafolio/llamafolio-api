import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import type { Balance, ContractStandard } from '@lib/adapter'
import { groupBy, groupBy2 } from '@lib/array'
import { areBalancesStale } from '@lib/balance'
import type { Category } from '@lib/category'
import { chainByChainId, chainById, type Chain } from '@lib/chains'
import { shortAddress, toDateTime, unixFromDateTime } from '@lib/fmt'
import { sum, sumBI } from '@lib/math'
import type { UnixTimestamp } from '@lib/type'

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
    unlockAt: balance.unlockAt != null ? parseInt(balance.unlockAt) : balance.unlockAt,
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
          price,
          balance_usd: balanceUSD,
          reward_usd: rewardUSD,
          debt_usd: debtUSD,
          health_factor: healthFactor,
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

export async function selectLatestBalancesSnapshotByFromAddresses(client: ClickHouseClient, fromAddresses: string[]) {
  const queryRes = await client.query({
    query: `
    SELECT
      "chain",
      "timestamp",
      sum("balance_usd") as "balance_usd",
      sum("debt_usd") as "debt_usd",
      sum("reward_usd") as "reward_usd"
    FROM lf.adapters_balances
    where from_address IN {fromAddresses: Array(String)}
    GROUP BY "chain", "timestamp"
    ORDER BY "timestamp" DESC
    LIMIT 1 BY "chain"
    `,
    query_params: {
      fromAddresses: fromAddresses.map((address) => address.toLowerCase()),
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
  fromAddress?: string
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

export async function selectLatestProtocolsBalancesByFromAddresses(client: ClickHouseClient, fromAddresses: string[]) {
  const protocolsBalances: LatestProtocolBalances[] = []

  const queryRes = await client.query({
    query: `
      SELECT
        ab.chain as chain,
        ab.adapter_id as adapter_id,
        ab.timestamp as timestamp,
        ab.balance as balance,
        ab.from_address as from_address,
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
          from_address,
          JSONExtractString(balance, 'address') AS address
        FROM ${environment.NS_LF}.adapters_balances
        ARRAY JOIN balances
        WHERE
          ("from_address", "timestamp") IN (
            SELECT "from_address", max("timestamp") AS "timestamp"
            FROM ${environment.NS_LF}.adapters_balances
            WHERE from_address IN {fromAddresses: Array(String)}
            GROUP BY "from_address"
          )
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
      fromAddresses: fromAddresses.map((address) => address.toLowerCase()),
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: number
      adapter_id: string
      timestamp: string
      balance: string
      from_address: string
      apy: string | null
      apy_base: string | null
      apy_reward: string | null
      apy_mean_30d: string | null
      il_risk: boolean | null
    }[]
  }

  const updatedAtByFromAddress: { [key: string]: UnixTimestamp | undefined } = {}

  const balancesByChain = groupBy(res.data, 'chain')

  for (const chainId in balancesByChain) {
    const chain = chainByChainId[parseInt(chainId)]?.id
    if (chain == null) {
      console.error(`Missing chain ${chainId}`)
      continue
    }

    // Group balances by protocol
    const balancesByProtocol = groupBy(balancesByChain[chainId], 'adapter_id')

    for (const protocolId in balancesByProtocol) {
      const balances = balancesByProtocol[protocolId].map((row) => {
        const balance = JSON.parse(row.balance)

        if (updatedAtByFromAddress[row.from_address] == null) {
          updatedAtByFromAddress[row.from_address] = unixFromDateTime(balancesByChain[chainId][0].timestamp)
        }

        return {
          ...balance,
          from_address: row.from_address,
          balanceUSD: balance.balance_usd != null ? parseFloat(balance.balance_usd) : undefined,
          debtUSD: balance.debt_usd != null ? parseFloat(balance.debt_usd) : undefined,
          rewardUSD: balance.reward_usd != null ? parseFloat(balance.reward_usd) : undefined,
          healthFactor: balance.health_factor != null ? parseFloat(balance.health_factor) : undefined,
          apy: row.apy != null ? parseFloat(row.apy) : undefined,
          apyBase: row.apy_base != null ? parseFloat(row.apy_base) : undefined,
          apyReward: row.apy_reward != null ? parseFloat(row.apy_reward) : undefined,
          apyMean30d: row.apy_mean_30d != null ? parseFloat(row.apy_mean_30d) : undefined,
          ilRisk: row.il_risk != null ? row.il_risk : undefined,
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

      // Aggregate wallet balances of each holder:
      // - sum tokens
      if (protocolId === 'wallet') {
        const tokensByAddress = groupBy(balances, 'address')
        const groupBalances: any[] = []

        for (const address in tokensByAddress) {
          const tokens = tokensByAddress[address]

          groupBalances.push({
            standard: tokens[0].standard,
            name: tokens[0].name,
            address: tokens[0].address,
            symbol: tokens[0].symbol,
            decimals: tokens[0].decimals,
            stable: tokens[0].stable,
            price: tokens[0].price,
            amount: sumBI(tokens.map((balance) => BigInt(balance.amount || 0))).toString(),
            balanceUSD: tokens[0].price != null ? sum(tokens.map((balance) => balance.balanceUSD || 0)) : undefined,
          })
        }

        protocolBalances.groups.push({
          balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
          balances: groupBalances,
        })
      } else {
        // Group balances by holder for all protocols but preserve each holder's groups (don't aggregate them) as it can be ambiguous.
        // Ex: lend/borrow "groups" look incorrect if we aggregate them as the holder may think the
        // collateral value is higher/lower
        const balancesByFromAddress = groupBy(balances, 'from_address')

        for (const fromAddress in balancesByFromAddress) {
          const balancesByGroupIdx = groupBy(balancesByFromAddress[fromAddress], 'group_idx')

          for (const groupIdx in balancesByGroupIdx) {
            const groupBalances = removeDuplicates(balancesByGroupIdx[groupIdx].map(formatBalance))

            protocolBalances.groups.push({
              fromAddress,
              balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
              debtUSD: sum(groupBalances.map((balance) => balance.debtUSD || 0)),
              rewardUSD: sum(groupBalances.map((balance) => balance.rewardUSD || 0)),
              healthFactor: balancesByGroupIdx[groupIdx][0].healthFactor,
              balances: groupBalances,
            })
          }
        }
      }

      protocolsBalances.push(protocolBalances)
    }
  }

  // updatedAt is undefined if any of the address has never been updated or the oldest updatedAt of all balances
  let updatedAt: number | undefined
  for (const address in updatedAtByFromAddress) {
    const addressUpdatedAt = updatedAtByFromAddress[address]
    if (addressUpdatedAt == null) {
      updatedAt = undefined
      break
    }

    if (updatedAt != null) {
      updatedAt = Math.min(updatedAt, addressUpdatedAt)
    } else {
      updatedAt = updatedAtByFromAddress[address]
    }
  }

  const staleAddresses = Object.keys(updatedAtByFromAddress).filter(
    (address) => updatedAtByFromAddress[address] == null || areBalancesStale(updatedAtByFromAddress[address]!),
  )

  return { updatedAt, protocolsBalances, staleAddresses }
}

function removeDuplicates(groupBalances: any) {
  const uniqueJSONSet = new Set()
  groupBalances.forEach((balance: any) => {
    const balanceJSON = JSON.stringify(balance)
    uniqueJSONSet.add(balanceJSON)
  })

  return Array.from(uniqueJSONSet).map((unique: any) => JSON.parse(unique))
}

export async function selectTokenHoldersBalances(
  client: ClickHouseClient,
  address: string,
  chainId: number,
  limit: number,
  offset: number,
) {
  const queryRes = await client.query({
    query: `
      WITH "holders" AS (
        SELECT
          "holder",
          "value"
        FROM (
          SELECT
            "holder",
            (sumMerge("value_to") - sumMerge("value_from")) AS "value"
          FROM evm_indexer2.tokens_balances_mv
          WHERE
            "type" = 'erc20' AND
            "chain" = {chainId: UInt64} AND
            "address_short" = {addressShort: String} AND
            "address" = {address: String}
          GROUP BY "chain", "holder_short", "holder", "address_short", "address", "id", "type"
        )
        WHERE "value" > 0
      ),
      (
        SELECT count(*) FROM "holders"
      ) AS "count"
      SELECT
        "holder",
        "value",
        "count"
      FROM "holders"
      ORDER BY "value" DESC
      LIMIT {limit: UInt8}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      address,
      addressShort: shortAddress(address),
      chainId,
      limit,
      offset,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      holder: string
      value: string
      count: string
    }[]
  }

  return res.data || []
}

export type Window = 'D' | 'W' | 'M' | 'Y'

/**
 * Get historical token balance
 * @param client
 * @param chainId
 * @param window
 */
export async function selectTokenBalanceChart(
  client: ClickHouseClient,
  addresses: `0x${string}`[],
  token: `0x${string}`,
  chainId: number,
  window: Window,
) {
  const chartData: [number, string][] = []
  const hours: { [key in Window]: number } = {
    D: 24,
    W: 24 * 7,
    M: 24 * 30,
    Y: 24 * 365,
  }

  const limit = hours[window] || 24

  const now = new Date()
  const toTimestamp = toDateTime(now)
  now.setHours(-limit)
  const fromTimestamp = toDateTime(now)

  const queryRes = await client.query({
    query: `
      SELECT
        toStartOfHour("hour") AS "hour",
        (sumMerge("value_to") - sumMerge("value_from")) AS "value"
      FROM evm_indexer2.tokens_balances_hour_mv
      WHERE
        "holder_short" IN {holdersShort: Array(String)} AND
        "holder" IN {holders: Array(String)} AND
        "hour" <= {toTimestamp: DateTime} AND
        "hour" >= {fromTimestamp: DateTime} AND
        "type" = 'erc20' AND
        "chain" = {chainId: UInt64} AND
        "address_short" = {addressShort: String} AND
        "address" = {address: String}
      GROUP BY "chain", "hour", "holder_short", "holder", "address_short", "address", "id", "type"
      ORDER BY "hour" DESC
      LIMIT {limit: UInt32};
    `,
    query_params: {
      holdersShort: addresses.map(shortAddress),
      holders: addresses,
      addressShort: shortAddress(token),
      address: token,
      chainId,
      limit,
      toTimestamp,
      fromTimestamp,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      hour: string
      /**
       * "value" represents the hourly cumulated token transfer delta.
       * To get the historical balance we need to get the current balance and
       * compute the running sum
       */
      value: string
    }[]
  }

  for (const row of res.data) {
    chartData.push([unixFromDateTime(row.hour), row.value])
  }

  return chartData
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
