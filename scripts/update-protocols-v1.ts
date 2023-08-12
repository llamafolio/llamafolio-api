import { connect } from '@db/clickhouse'

import { selectDistinctAdaptersIdsV1 } from '../src/db/adapters'
import { updateProtocolsV1 } from '../src/db/protocols'
import { fetchProtocols } from '../src/lib/protocols'

async function main() {
  const client = connect()

  try {
    const adapters = await selectDistinctAdaptersIdsV1(client)

    // 'wallet' is a custom LlamaFolio adapter (not a protocol)
    const adaptersIds = adapters.map((adapter) => adapter.id).filter((id) => id !== 'wallet')

    const protocols = await fetchProtocols(adaptersIds)

    await updateProtocolsV1(client, protocols)

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
