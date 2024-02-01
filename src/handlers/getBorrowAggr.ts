import { selectDistinctAdaptersIds } from '@db/adapters'
import { selectLatestTokensYields, simulateBestStrategies, type BorrowStrategy } from '@db/borrowAggr'
import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import { isNotNullish } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const { chain, collateral, borrowable } = event.queryStringParameters || {}
  const chainId = chain ? getChainId(chain) : null
  const collateralAddress = collateral ? parseAddress(collateral) : null
  const borrowableAddress = borrowable ? parseAddress(borrowable) : null

  try {
    const [adapterIdsRes, llamaDatas, defillamaDatas] = await Promise.all([
      selectDistinctAdaptersIds(client),
      selectLatestTokensYields(client),
      fetch('https://yields.llama.fi/lendBorrow').then((res) => res.json()),
    ])

    const tokens = llamaDatas
      .map((llamaData) => {
        const matchingRawData = defillamaDatas.find((rawData: any) => rawData.pool === llamaData.pool)
        return matchingRawData ? { ...llamaData, ...matchingRawData } : null
      })
      .filter(isNotNullish)
      .map(mergeToken)
      .filter((token) => adapterIdsRes.map(({ id }) => id).includes(token.adapter_id))

    const lendTokens = tokens.filter((token) => token.lend)
    const borrowTokens = tokens.filter((token) => token.borrow)

    const borrowStrategies = simulateBestStrategies(
      lendTokens,
      borrowTokens,
      chainId,
      collateralAddress,
      borrowableAddress,
    )

    const tableData = borrowStrategies.map((borrowStrategy: BorrowStrategy) => ({
      Chain: `${borrowStrategy.chain}`,
      AdapterId: `${borrowStrategy.adapter_id}`,
      Collateral: `${borrowStrategy.collateral}`,
      Borrow: `${borrowStrategy.borrow}`,
      'Total Interest': `${borrowStrategy.totalInterest.toFixed(4)} %`,
      'Net Lend': `${borrowStrategy.lendInterest.toFixed(4)} %`,
      'Net Borrow': `${borrowStrategy.borrowInterest.toFixed(4)} %`,
      Ltv: `${(borrowStrategy.ltv * 100).toFixed(2)} %`,
    }))

    console.table(tableData)

    return success(borrowStrategies, { maxAge: 3 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to find borrow strategies', error)
    return serverError('Failed to find borrow strategies', { error })
  }
}

function mergeToken(token: any) {
  return { ...token, lend: token.ltv !== undefined, borrow: !!token.borrowable }
}
