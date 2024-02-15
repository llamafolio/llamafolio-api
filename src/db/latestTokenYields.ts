import type { ClickHouseClient } from '@clickhouse/client'

export interface LatestTokenYields {
  chain: number
  adapter_id: string
  address: string
  pool: string
  apy: number
  apy_reward: number
  ltv: number
  totalSupplyUsd: number
  totalBorrowUsd: number
  underlyings: string[]
  borrowable: boolean
}

export async function selectLatestTokensYields(client: ClickHouseClient) {
  const queryRes = await client.query({
    query: `
        SELECT 
            y.chain,
            y.adapter_id,
            y.address,
            y.pool,
            y.apy,
            y.apy_reward,
            y.underlyings
        FROM 
           lf.yields y
        INNER JOIN (
        SELECT 
            address, 
            chain, 
            max(timestamp) as max_timestamp
        FROM 
            lf.yields
        GROUP BY 
            address, chain
)       AS latest
        ON y.address = latest.address AND y.chain = latest.chain AND y.timestamp = latest.max_timestamp
        WHERE length(underlyings) = 1;
    `,
  })

  const { data } = (await queryRes.json()) as {
    data: LatestTokenYields[]
  }

  return data
}
