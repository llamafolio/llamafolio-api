import '../env'

import { insertProtocols } from '../src/db/protocols'
import { client as redisClient } from '../src/db/redis'
import { fetchProtocols } from '../src/handlers/updateProtocols'

async function main() {
  try {
    const protocols = await fetchProtocols()

    await insertProtocols(redisClient, protocols)

    console.log(`Inserted ${protocols.length} protocols`)
  } catch (e) {
    console.log('Failed to update protocols', e)
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
