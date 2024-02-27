import { client } from '@db/clickhouse'
import { fetchLendBorrowPools, insertLendBorrow, type LendBorrowPoolStorable } from '@db/lendBorrow'
import { fetchYields } from '@db/yields'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { getRPCClient } from '@lib/chains'
import { toDateTime } from '@lib/fmt'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateLendBorrow: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateLendBorrow', {}, 'Event')

  return success({})
}

export const scheduledUpdateLendBorrow = wrapScheduledLambda(updateLendBorrow)
export const handleUpdateLendBorrow = updateLendBorrow

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const baseContext: BaseContext = {
    chain: 'ethereum',
    adapterId: '',
    client: getRPCClient({ chain: 'ethereum' }),
  }

  try {
    const now = new Date()

    const [yields, lendBorrow] = await Promise.all([fetchYields(), fetchLendBorrowPools()])

    const yieldsPoolById = keyBy(yields, 'pool')

    const data: LendBorrowPoolStorable[] = []

    for (const pool of lendBorrow) {
      const yieldPool = yieldsPoolById[pool.pool]
      if (!yieldPool) {
        continue
      }

      data.push({
        chain: yieldPool.chain,
        adapterId: yieldPool.adapter_id,
        address: yieldPool.address,
        pool: yieldPool.pool,
        apyBaseBorrow: pool.apyBaseBorrow,
        apyRewardBorrow: pool.apyRewardBorrow,
        totalSupplyUsd: pool.totalSupplyUsd,
        totalBorrowUsd: pool.totalBorrowUsd,
        debtCeilingUsd: pool.debtCeilingUsd,
        ltv: pool.ltv,
        borrowable: pool.borrowable,
        borrowFactor: pool.borrowFactor,
        underlyings: (pool.underlyingTokens || []).map((address) => address.toLowerCase()).sort(),
        rewards: (pool.rewardTokens || []).map((address) => address.toLowerCase()).sort(),
        timestamp: toDateTime(now),
      })
    }

    await insertLendBorrow(client, data)

    console.log(`Inserted ${data.length} lend/borrow pools`)

    return success({})
  } catch (error) {
    console.error('Failed to update lend/borrow', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to update lend/borrow',
      message: (error as any).message,
    })
    return serverError('Failed to update lend/borrow')
  }
}
