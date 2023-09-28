import { selectCalendarEvents } from '@db/calendar'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const calendarEvents = await selectCalendarEvents(client, address)

    return success({ data: calendarEvents }, { maxAge: 10 * 60 })
  } catch (e) {
    console.error('Failed to retrieve calendar', e)
    return serverError('Failed to retrieve calendar')
  }
}
