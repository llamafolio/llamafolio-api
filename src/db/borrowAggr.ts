import type { ClickHouseClient } from '@clickhouse/client'

export interface BorrowStrategyToken {
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

export interface BorrowStrategy {
  chain: number
  adapter_id: string
  collateral: string
  borrow: string
  lendInterest: number
  borrowInterest: number
  totalInterest: number
  collateralPool: string
  borrowPool: string
  ltv: number
  totalSupplyUsd: number
  totalBorrowUsd: number
}

export function simulateBestStrategies(
  lendTokens: BorrowStrategyToken[],
  borrowTokens: BorrowStrategyToken[],
  chain?: number | null,
  cAddress?: string | null,
  bAddress?: string | null,
): BorrowStrategy[] {
  const bestStrategies: BorrowStrategy[] = []

  lendTokens.forEach((lendToken) => {
    if (lendToken.ltv !== 0) {
      borrowTokens.forEach((borrowToken) => {
        if (lendToken.totalSupplyUsd - borrowToken.totalBorrowUsd > 0) {
          if (lendToken.adapter_id === borrowToken.adapter_id) {
            const lendInterest = calculateLendProfit(lendToken)
            const borrowInterest = calculateBorrowingCost(borrowToken)
            const totalInterest = lendInterest + borrowInterest * lendToken.ltv

            const {
              chain: cChain,
              underlyings: collateral,
              adapter_id,
              ltv,
              pool: collateralPool,
              totalSupplyUsd,
              totalBorrowUsd,
            } = lendToken
            const { underlyings: borrow, pool: borrowPool } = borrowToken

            bestStrategies.push({
              chain: cChain,
              adapter_id,
              collateral: collateral[0].toLowerCase(),
              borrow: borrow[0].toLowerCase(),
              lendInterest,
              borrowInterest,
              totalInterest,
              collateralPool,
              borrowPool,
              ltv,
              totalSupplyUsd,
              totalBorrowUsd,
            })
          }
        }
      })
    }
  })

  return bestStrategies
    .filter(
      (strategy: any) =>
        (!chain || strategy.chain == chain) &&
        (!cAddress || strategy.collateral == cAddress.toLowerCase()) &&
        (!bAddress || strategy.borrow == bAddress.toLowerCase()),
    )
    .sort((a: any, b: any) => b.totalInterest - a.totalInterest)
}

function calculateLendProfit(lendToken: BorrowStrategyToken) {
  return lendToken.apy
}

function calculateBorrowingCost(borrowToken: BorrowStrategyToken) {
  if (borrowToken.apy_reward !== null) {
    return -borrowToken.apy + borrowToken.apy_reward
  } else {
    return -borrowToken.apy
  }
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
    data: BorrowStrategyToken[]
  }

  return data
}
