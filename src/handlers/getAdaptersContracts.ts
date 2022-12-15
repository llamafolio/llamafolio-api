import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { bufToStr } from '@lib/buf'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const chain = event.pathParameters?.chain
  if (!chain) {
    return badRequest('Missing chain parameter')
  }

  const client = await pool.connect()

  try {
    const adapterContracts = await client.query(`select address, adapter_id from contracts where chain = '${chain}'`)

    if (adapterContracts.rows.length === 0) {
      return {
        data: [],
      }
    }

    const contracts = adapterContracts.rows
      .map((row) => ({
        adapter_id: row.adapter_id,
        address: bufToStr(row.address),
      }))
      .filter((contract) => contract.adapter_id !== 'wallet')

    const filteredContracts = Array.from(new Set(contracts.map((contract) => contract.address))).map((address) => {
      return contracts.find((contract) => contract.address === address)
    })

    return success(
      {
        data: filteredContracts,
      },
      { maxAge: 2 * 60 },
    )
  } catch (e) {
    console.error('Failed to adapters contracts', e)
    return serverError('Failed to adapters contracts')
  } finally {
    client.release(true)
  }
}
