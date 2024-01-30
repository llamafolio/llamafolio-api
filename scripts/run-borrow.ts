import fs from 'node:fs'
import path from 'node:path'

import { client } from '@db/clickhouse'
import { selectTokenYields, type TokenYield } from '@db/yields'
import { groupBy } from '@lib/array'
import type { Category } from '@lib/category'
import { isNotNullish } from '@lib/type'

import { getChainId } from '../src/lib/chains'

function help() {
  console.log('pnpm run borrow {collateral} {borrow} {chain}')
}

function getAdapters() {
  const src = path.join(__dirname, '..', 'src', 'adapters')

  const adapters: string[] = []

  fs.readdirSync(src).forEach(function (child) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(path.join(src, child, 'index.ts'))) {
      adapters.push(child)
    }
  })

  return adapters.sort()
}

/**
 * Find the best way to borrow an asset for a given collateral asset
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: borrow.ts
  // argv[2]: chain
  // argv[3]: collateral
  // argv[4]: borrow
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chainId = getChainId(process.argv[2])
  const collateral = process.argv[3] as `0x${string}`
  const borrow = process.argv[4] as `0x${string}`
  const adapterIds = getAdapters()

  try {
    const [{ data: cData }, { data: bData }, rawDatas] = await Promise.all([
      selectTokenYields(client, chainId, collateral),
      selectTokenYields(client, chainId, borrow),
      fetch('https://yields.llama.fi/lendBorrow').then((res) => res.json()),
    ])

    const blacklistedAdapterIds = ['silo-finance']
    const token0s = processMapData(cData, adapterIds, 'lend', blacklistedAdapterIds)
    const token1s = processMapData(bData, adapterIds, 'borrow', blacklistedAdapterIds)

    const tokens = groupBy(
      ([...token0s, ...token1s] || [])
        .map((token) => {
          const matchingRawData = rawDatas.find((rawData: any) => rawData.pool === token.pool)
          if (!matchingRawData) return null
          return mergeTokens(matchingRawData, token)
        })
        .filter(isNotNullish),
      'category',
    )

    const bestStrategies = simulateBestStrategies(tokens.lend, tokens.borrow)

    const tableData = bestStrategies.map((bestStrategy: any) => {
      const { adapterId, collateral, borrow, totalInterest, lendInterest, borrowInterest, ltv } = bestStrategy
      return {
        AdapterId: `${adapterId}`,
        Collateral: `${collateral}`,
        Borrow: `${borrow}`,
        'Total Interest': `${totalInterest.toFixed(4)} %`,
        'Net Lend': `${lendInterest.toFixed(4)} %`,
        'Net Borrow': `${borrowInterest.toFixed(4)} %`,
        Ltv: `${(ltv * 100).toFixed(2)} %`,
      }
    })

    console.table(tableData)
  } catch (e) {
    console.log('Failed to find the best way to borrow', e)
  }
}

function simulateBestStrategies(lendTokens: any[], borrowTokens: any[]) {
  const bestStrategies: any = []

  lendTokens.forEach((lendToken) => {
    if (lendToken.ltv !== 0) {
      borrowTokens.forEach((borrowToken) => {
        if (lendToken.adapterId === borrowToken.adapterId) {
          const lendInterest = calculateLendProfit(lendToken)
          const borrowInterest = calculateBorrowingCost(borrowToken)
          const totalInterest = lendInterest + borrowInterest * lendToken.ltv

          const { underlyingTokens: collateral, adapterId, ltv } = lendToken
          const { underlyingTokens: borrow } = borrowToken

          bestStrategies.push({
            adapterId,
            collateral: collateral[0],
            borrow: borrow[0],
            ltv,
            lendInterest,
            borrowInterest,
            totalInterest,
          })
        }
      })
    }
  })

  return bestStrategies.sort((a: any, b: any) => b.totalInterest - a.totalInterest)
}

function calculateLendProfit(lendToken: any) {
  return lendToken.apy
}

function calculateBorrowingCost(borrowToken: any) {
  if (borrowToken.apyRewardBorrow !== null) {
    return -borrowToken.apyBaseBorrow + borrowToken.apyRewardBorrow
  } else {
    return -borrowToken.apyBaseBorrow
  }
}

function mergeTokens(target: any, source: any) {
  for (const key in source) {
    if (source[key] !== undefined) {
      target[key] = source[key]
    }
  }
  return target
}

function processMapData(
  data: TokenYield[],
  adapterIds: string[],
  category: Category,
  blacklistedAdapterIds: string[],
): TokenYield[] {
  return data
    .filter((d: any) => d.apy && adapterIds.includes(d.adapterId) && !blacklistedAdapterIds.includes(d.adapterId))
    .map((d) => ({ ...d, category }))
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
