import '@environment'

import { client } from '@db/clickhouse'
import { fetchLendBorrowPools, insertLendBorrow, type LendBorrowPoolStorable } from '@db/lendBorrow'
import { fetchYields } from '@db/yields'
import { keyBy } from '@lib/array'
import { toDateTime } from '@lib/fmt'

async function main() {
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
  } catch (e) {
    console.log('Failed to update lend/borrow', e)
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
