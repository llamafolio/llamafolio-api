import { selectDistinctAdaptersIds } from '../src/db/adapters'
import pool from '../src/db/pool'
import { deleteAllProtocols, insertProtocols } from '../src/db/protocols'
import { fetchProtocols } from '../src/lib/protocols'

async function main() {
  const client = await pool.connect()

  try {
    const adapters = await selectDistinctAdaptersIds(client)

    // 'wallet' is a custom LlamaFolio adapter (not a protocol)
    const adaptersIds = adapters.map((adapter) => adapter.id).filter((id) => id !== 'wallet')

    const protocols = await fetchProtocols(adaptersIds)

    await client.query('BEGIN')

    await deleteAllProtocols(client)

    await insertProtocols(client, protocols)

    await client.query('COMMIT')

    console.log(`Inserted ${protocols.length} protocols`)
  } catch (e) {
    console.log('Failed to update protocols', e)
    await client.query('ROLLBACK')
  } finally {
    client.release(true)
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
