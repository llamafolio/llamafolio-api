import type { ClickHouseClient } from '@clickhouse/client'
import { shortAddress, unixFromDateTime } from '@lib/fmt'

export interface GasChart {
  timestamp: number
  totalGasFee: string
  avgGasFee: string
  medianGasFee: string
  minGasFee: string
  maxGasFee: string
}

/**
 * Get address total gas used and transactions count on a chain
 * @param client
 * @param chainId
 * @param address
 */
export async function selectGasUsed(client: ClickHouseClient, chainId: number, address: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        count() AS "count",
        0 AS "totalGasUsed"
      FROM evm_indexer2.transactions_from_agg_mv
      WHERE
        "from_short" = {addressShort: String} AND
        "from_address" = {address: String} AND
        "chain" = {chainId: UInt64}
      GROUP BY "from_short", "from_address", "chain"
      UNION ALL
      SELECT
        0 AS "count",
        sum("total_gas_used") AS "totalGasUsed"
      FROM evm_indexer2.gas_used_from_agg_mv
      WHERE
        "from_short" = {addressShort: String} AND
        "from_address" = {address: String} AND
        "chain" = {chainId: UInt64}
      GROUP BY "from_short", "from_address", "chain", "to_address";
    `,
    query_params: {
      chainId,
      address,
      addressShort: shortAddress(address),
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      count: string
      totalGasUsed: string
    }[]
  }

  return {
    totalGasUsed: Math.max(...res.data.map((row) => parseInt(row.totalGasUsed) || 0)),
    transactionCount: Math.max(...res.data.map((row) => parseInt(row.count) || 0)),
  }
}

export type Window = 'D' | 'W' | 'M'

/**
 * Get chain historical gas usage metrics
 * @param client
 * @param chainId
 * @param window
 */
export async function selectChainGasChart(client: ClickHouseClient, chainId: number, window: Window) {
  const chartData: GasChart[] = []
  const hours: { [key in Window]: number } = {
    D: 24,
    W: 24 * 7,
    M: 24 * 30,
  }

  const interval = hours[window] || 24

  const queryRes = await client.query({
    query: `
      SELECT
        toStartOfHour("timestamp") AS "hour",
        sum("gas_price" * "gas_used") AS "total_gas_fee",
        round(avg("gas_price" * "gas_used")) AS "avg_gas_fee",
        quantileExact(0.5)("gas_price" * "gas_used") AS "median_gas_fee",
        min("gas_price" * "gas_used") AS "min_gas_fee",
        max("gas_price" * "gas_used") AS "max_gas_fee"
      FROM evm_indexer2.transactions
      WHERE "chain" = {chainId: UInt64} AND "hour" >= toStartOfHour(now()) - interval {interval: UInt16} hour
      GROUP BY "hour"
      ORDER BY "hour" ASC;
    `,
    query_params: {
      chainId,
      interval,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      hour: string
      total_gas_fee: string
      avg_gas_fee: string
      median_gas_fee: string
      min_gas_fee: string
      max_gas_fee: string
    }[]
  }

  for (const row of res.data) {
    const gasUsed: GasChart = {
      timestamp: unixFromDateTime(row.hour),
      totalGasFee: row.total_gas_fee,
      avgGasFee: row.avg_gas_fee,
      medianGasFee: row.median_gas_fee,
      minGasFee: row.min_gas_fee,
      maxGasFee: row.max_gas_fee,
    }

    chartData.push(gasUsed)
  }

  return chartData
}
