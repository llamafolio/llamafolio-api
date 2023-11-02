import { badRequest, serverError, success } from '@handlers/response'
import { getCalendarEvents } from '@lib/calendar'
import { isHex } from '@lib/contract'
import { parseAddresses } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Missing address parameter')
  }

  if (addresses.some((address) => !isHex(address))) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const calendarEvents = await getCalendarEvents(addresses)

    return success({ data: calendarEvents }, { maxAge: 10 * 60 })
  } catch (e) {
    console.error('Failed to retrieve calendar', e)
    return serverError('Failed to retrieve calendar')
  }
}
