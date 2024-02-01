import { selectDistinctAdaptersIds } from '@db/adapters'
import {
  selectLatestTokensYields,
  simulateBestStrategies,
  type BorrowStrategy,
  type BorrowStrategyToken,
} from '@db/borrowAggr'
import { client } from '@db/clickhouse'
import { getChainId } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import { isNotNullish } from '@lib/type'

function help() {
  console.log('pnpm run optimizer {address}')
}

/**
 * Find the best way to borrow an asset for a given collateral asset
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: optimizer.ts
  // argv[2]: chain
  // argv[3]: cAddress
  // argv[4]: bAddress
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chainId = getChainId(process.argv[2])
  const collateralAddress = parseAddress(process.argv[3])
  const borrowableAddress = parseAddress(process.argv[4])

  try {
    const [adapterIdsRes, llamaDatas, defillamaDatas] = await Promise.all([
      selectDistinctAdaptersIds(client),
      selectLatestTokensYields(client),
      fetch('https://yields.llama.fi/lendBorrow').then((res) => res.json()),
    ])

    const adapterIds = adapterIdsRes.map((obj) => obj.id)

    const tokens = llamaDatas
      .map((llamaData) => {
        const matchingRawData = defillamaDatas.find((rawData: any) => rawData.pool === llamaData.pool)
        return matchingRawData ? { ...llamaData, ...matchingRawData } : null
      })
      .filter(isNotNullish)
      .map(mergeToken)
      .filter((token) => adapterIds.includes(token.adapter_id))

    const lendTokens = tokens.filter((token) => token.lend === true)
    const borrowTokens = tokens.filter((token) => token.borrow === true)

    const borrowStrategies = simulateBestStrategies(
      lendTokens,
      borrowTokens,
      chainId,
      collateralAddress,
      borrowableAddress,
    )

    const tableData = borrowStrategies.map((borrowStrategy: BorrowStrategy) => {
      const { chain, adapter_id, collateral, borrow, totalInterest, lendInterest, borrowInterest, ltv } = borrowStrategy

      return {
        Chain: `${chain}`,
        AdapterId: `${adapter_id}`,
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

function mergeToken(token: BorrowStrategyToken) {
  return { ...token, lend: token.ltv !== undefined, borrow: !!token.borrowable }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
