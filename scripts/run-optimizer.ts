import { selectDistinctAdaptersIds } from '@db/adapters'
import { selectLatestProtocolsBalancesByFromAddresses } from '@db/balances'
import { selectLatestTokensYields, simulateBestStrategies } from '@db/borrowAggr'
import { client } from '@db/clickhouse'
import { parseAddress } from '@lib/fmt'
import { isNotNullish } from '@lib/type'

function help() {
  console.log('pnpm run optimizer {address}')
}

/**
 * Find the best way to optimize borrow strategy of an user
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: optimizer.ts
  // argv[2]: address

  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const address = parseAddress(process.argv[2])
  if (address == null) {
    console.error(`Could not parse address ${process.argv[2]}`)
    return
  }

  try {
    const [{ protocolsBalances }, { lendTokens, borrowTokens }] = await Promise.all([
      selectLatestProtocolsBalancesByFromAddresses(client, [address]),
      fetchAndProcessBorrowToken(),
    ])

    const borrowStrategies = simulateBestStrategies(lendTokens, borrowTokens)

    const filteredProtocolsBalances = protocolsBalances.filter((protocolBalance) => {
      return borrowStrategies.some((borrowStrategy) => borrowStrategy.adapter_id === protocolBalance.id)
    })

    const mergedInfos: any[] = []

    for (const protocolBalance of filteredProtocolsBalances) {
      const { id, chain, groups } = protocolBalance

      groups.forEach(({ balances }: any) => {
        balances.forEach((balance: any) => {
          const { category, underlyings } = balance
          const renamedUnderlyings = category === 'borrow' ? 'borrow' : 'collateral'

          const existingInfo = mergedInfos.find((info: any) => info.id === id && info.chain === chain)

          if (!existingInfo) {
            mergedInfos.push({ id, chain, [renamedUnderlyings]: [underlyings[0].address] })
          } else {
            if (!existingInfo[renamedUnderlyings]) {
              existingInfo[renamedUnderlyings] = []
            }
            existingInfo[renamedUnderlyings].push(underlyings[0].address)
          }
        })
      })
    }

    const userStrategies = findUserStrategies(mergedInfos, borrowStrategies)
    const betterStrategies = findBetterStrategies(userStrategies, borrowStrategies)

    displayBetterStrategiesTable(betterStrategies)

    return betterStrategies
  } catch (e) {
    console.log('Failed to find the best way to borrow', e)
  }
}

async function fetchAndProcessBorrowToken() {
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

    return { lendTokens, borrowTokens }
  } catch (error) {
    console.error('Failed to retrieve data', error)
    throw error
  }
}

function mergeToken(token: any) {
  return { ...token, lend: token.ltv !== undefined, borrow: !!token.borrowable }
}

function findUserStrategies(mergedInfos: any[], borrowStrategy: any[]): any[] {
  return borrowStrategy.filter((strategy) => {
    return mergedInfos.some((info) => {
      return (
        strategy.adapter_id === info.id &&
        strategy.collateral === info.collateral[0] &&
        strategy.borrow === info.borrow[0]
      )
    })
  })
}

function findBetterStrategies(initialUserStrategies: any, allStrategies: any) {
  const betterStrategiesByUser = []

  for (const initialUserStrategy of initialUserStrategies) {
    const betterStrategies = []

    for (const strategy of allStrategies) {
      if (
        initialUserStrategy.collateral === strategy.collateral &&
        initialUserStrategy.borrow === strategy.borrow &&
        strategy.totalInterest > initialUserStrategy.totalInterest
      ) {
        const interestDifference = strategy.totalInterest - initialUserStrategy.totalInterest
        betterStrategies.push({ ...strategy, interestDifference })
      }
    }

    if (betterStrategies.length > 0) {
      betterStrategies.sort((a, b) => b.interestDifference - a.interestDifference)
      betterStrategiesByUser.push({ initialUserStrategy, strategies: betterStrategies })
    }
  }

  return betterStrategiesByUser
}

function displayBetterStrategiesTable(betterStrategiesByUser: any) {
  for (const userAndStrategies of betterStrategiesByUser) {
    const { initialUserStrategy, strategies } = userAndStrategies

    const tableStrategies = [initialUserStrategy, ...strategies].map((borrowStrategy: any, index: number) => ({
      'User Strategy': index === 0 ? true : false,
      Chain: `${borrowStrategy.chain}`,
      AdapterId: `${borrowStrategy.adapter_id}`,
      Collateral: `${borrowStrategy.collateral}`,
      Borrow: `${borrowStrategy.borrow}`,
      'Total Interest': `${borrowStrategy.totalInterest.toFixed(4)} %`,
      'Net Lend': `${borrowStrategy.lendInterest.toFixed(4)} %`,
      'Net Borrow': `${borrowStrategy.borrowInterest.toFixed(4)} %`,
      Ltv: `${(borrowStrategy.ltv * 100).toFixed(2)} %`,
      Apy: `${(borrowStrategy.ltv * 100).toFixed(2)} %`,
      'Apy Difference': index === 0 ? '' : `${borrowStrategy.interestDifference.toFixed(4)} %`,
    }))

    console.table(tableStrategies)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
