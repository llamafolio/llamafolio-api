import '../environment'

import { client } from '../src/db/clickhouse'
import { fetchYields, insertYields } from '../src/db/yields'

async function main() {
  try {
    const yields = await fetchYields()

    await insertYields(client, yields)

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
