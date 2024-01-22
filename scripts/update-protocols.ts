import { client } from '@db/clickhouse'
import environment from '@environment'
import { toDateTime } from '@lib/fmt'

import { insertProtocols } from '../src/db/protocols'
import { fetchProtocols } from '../src/lib/protocols'

async function main() {
  try {
    const queryRes = await client.query({
      query: `
        SELECT distinct("id") FROM ${environment.NS_LF}.adapters
        WHERE "id" NOT IN (
          SELECT distinct("slug") FROM ${environment.NS_LF}.protocols
        );
      `,
    })

    const res = (await queryRes.json()) as {
      data: { id: string }[]
    }

    // 'wallet' is a custom LlamaFolio adapter (not a protocol)
    const adaptersIds = res.data.map((row) => row.id).filter((id) => id !== 'wallet')

    const updated_at = toDateTime(new Date())

    const protocols = await fetchProtocols(adaptersIds)

    for (const protocol of protocols) {
      protocol.updated_at = updated_at
    }

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
