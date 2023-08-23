import { connect } from '@db/clickhouse'

import { selectDistinctAdaptersIds } from '../src/db/adapters'
import { insertProtocols } from '../src/db/protocols'
import { fetchProtocols } from '../src/lib/protocols'

async function main() {
  const client = connect()

  try {
    const adapters = await selectDistinctAdaptersIds(client)

    // 'wallet' is a custom LlamaFolio adapter (not a protocol)
    const adaptersIds = adapters.map((adapter) => adapter.id).filter((id) => id !== 'wallet')

    const protocols = await fetchProtocols(adaptersIds)

    await insertProtocols(client, protocols)

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
