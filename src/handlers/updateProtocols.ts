import { client } from '@db/clickhouse'
import { insertProtocols } from '@db/protocols'
import environment from '@environment'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { toDateTime } from '@lib/fmt'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocols } from '@lib/protocols'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateProtocols: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateProtocols', {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocols = wrapScheduledLambda(updateProtocols)

export const handler: APIGatewayProxyHandler = async () => {
  const baseContext: BaseContext = {
    chain: 'ethereum',
    adapterId: '',
    client: getRPCClient({ chain: 'ethereum' }),
  }

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

    return success({})
  } catch (error) {
    console.log('Failed to update protocols', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to update protocols',
      message: (error as any).message,
    })
    return serverError('Failed to update protocols')
  }
}
