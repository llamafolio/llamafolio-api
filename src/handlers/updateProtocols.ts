import { client } from '@db/clickhouse'
import { insertProtocols } from '@db/protocols'
import environment from '@environment'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocols } from '@lib/protocols'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateProtocols: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateProtocols', {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocols = wrapScheduledLambda(updateProtocols)

export const handler: APIGatewayProxyHandler = async () => {
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

    const protocols = await fetchProtocols(adaptersIds)

    await insertProtocols(client, protocols)

    console.log(`Inserted ${protocols.length} protocols`)

    return success({})
  } catch (e) {
    console.log('Failed to update protocols', e)
    return serverError('Failed to update protocols')
  }
}
