import '../environment'

import { connect } from '../src/db/clickhouse'
import { deleteOldYields, fetchYields, insertYields } from '../src/db/yields'

async function main() {
  const client = connect()

  try {
    const yields = await fetchYields()

    await deleteOldYields(client)

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
