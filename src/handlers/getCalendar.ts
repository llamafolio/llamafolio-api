import { badRequest, serverError, success } from '@handlers/response'
import type { BalancesContext } from '@lib/adapter'
import { getCalendarEvents } from '@lib/calendar'
import { getRPCClient } from '@lib/chains'
import { parseAddresses } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Invalid address parameter')
  }

  try {
    const calendarEvents = await getCalendarEvents(addresses)

    return success({ data: calendarEvents }, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to retrieve calendar', error)

    for (const address of addresses) {
      const balancesContext: BalancesContext = {
        chain: 'ethereum',
        adapterId: '',
        client: getRPCClient({ chain: 'ethereum' }),
        address,
      }

      await sendSlackMessage(balancesContext, {
        level: 'error',
        title: 'Failed to retrieve calendar',
        message: (error as any).message,
      })
    }

    return serverError('Failed to retrieve calendar')
  }
}
