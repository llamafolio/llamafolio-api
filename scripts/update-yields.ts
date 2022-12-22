import '../env'

import { client as redisClient } from '../src/db/redis'
import { replaceYields } from '../src/db/yields'
import { fetchYields } from '../src/handlers/updateYields'

async function main() {
  try {
    const yields = await fetchYields()

    await replaceYields(redisClient, yields)

    console.log(`Inserted ${yields.length} yields`)
  } catch (e) {
    console.log('Failed to update yields', e)
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
