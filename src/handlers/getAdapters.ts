import { selectDistinctAdaptersIds } from '@db/adapters'
import { connect } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const client = connect()

    const adapters = await selectDistinctAdaptersIds(client)

    return success(
      {
        data: {
          adapters: adapters.map((adapter) => ({ id: adapter.id })),
        },
      },
      { maxAge: 30 * 60 },
    )
  } catch (error) {
    console.error('Failed to get adapters', { error })
    return serverError('Failed to get adapters')
  }
}
