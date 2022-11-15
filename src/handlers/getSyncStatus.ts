import pool from '@db/pool'
import { serverError, success } from '@handlers/response'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    // Returns chain, max block processed and an estimate count of the number of blocks processed
    // See: https://wiki.postgresql.org/wiki/Count_estimate
    const blocksSyncedRes = await client.query(`select * from blocks_synced();`, [])

    const blocksSynced = blocksSyncedRes.rows.map((row) => ({
      chain: row.chain,
      count: parseInt(row.count),
      max: parseInt(row.max),
    }))

    return success(
      {
        data: blocksSynced,
      },
      { maxAge: 10 },
    )
  } catch (e) {
    console.error('Failed to retrieve sync status', e)
    return serverError('Failed to retrieve sync status')
  } finally {
    client.release(true)
  }
}
