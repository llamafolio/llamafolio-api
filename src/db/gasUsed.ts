import type { ClickHouseClient } from '@clickhouse/client'
import { shortAddress, unixFromDateTime } from '@lib/fmt'

export interface GasUsedChart {
  timestamp: number
  totalGasUsed: number
  avgGasUsed: number
  medianGasUsed: number
  minGasUsed: number
  maxGasUsed: number
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
export async function selectGasUsedChart(client: ClickHouseClient, chainId: number, window: Window) {
  const chartData: GasUsedChart[] = []
  const hours: { [key in Window]: number } = {
    D: 24,
    W: 24 * 7,
    M: 24 * 30,
  }

  const limit = hours[window] || 24

  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        toStartOfHour("hour") AS "hour",
        sum("total_gas_used") AS "totalGasUsed",
        round(avg("avg_gas_used")) AS "avgGasUsed",
        quantileExact(0.5)("median_gas_used") AS "medianGasUsed",
        min("min_gas_used") AS "minGasUsed",
        max("max_gas_used") AS "maxGasUsed"
      FROM evm_indexer2.gas_used_hour_agg_mv
      WHERE "chain" = {chainId: UInt64}
      GROUP BY "chain", "hour"
      ORDER BY "hour" DESC
      LIMIT {limit: UInt16};
    `,
    query_params: {
      chainId,
      limit,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      hour: string
      totalGasUsed: string
      avgGasUsed: string
      medianGasUsed: string
      minGasUsed: string
      maxGasUsed: string
    }[]
  }

  for (const row of res.data) {
    const gasUsed: GasUsedChart = {
      timestamp: unixFromDateTime(row.hour),
      totalGasUsed: parseInt(row.totalGasUsed),
      avgGasUsed: parseInt(row.avgGasUsed),
      medianGasUsed: parseInt(row.medianGasUsed),
      minGasUsed: parseInt(row.minGasUsed),
      maxGasUsed: parseInt(row.maxGasUsed),
    }

    chartData.push(gasUsed)
  }

  return chartData
}
