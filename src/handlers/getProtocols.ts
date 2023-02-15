import { success } from '@handlers/response'
import { Cache } from '@lib/cache'
import { fetchProtocolsLite, getProtocolColor, IProtocolLite } from '@lib/protocols'
import { APIGatewayProxyHandler } from 'aws-lambda'

const cache = new Cache<string, IProtocolLite[] | string | undefined | null>()

export const handler: APIGatewayProxyHandler = async (event) => {
  const queries = event.queryStringParameters

  let protocols = cache.get<IProtocolLite[]>('protocols')
  if (!protocols) {
    protocols = await fetchProtocolsLite()
    // update protocols cache
    cache.set('protocols', protocols, 0)
  }

  let colors: (string | null | undefined)[] = []

  if (queries?.ids) {
    const ids = queries.ids.split(',')
    const idsSet = new Set(ids)

    protocols = protocols.filter((protocol) => idsSet.has(protocol.slug))

    colors = await Promise.all(ids.map((id) => cache.get<string>(`color-${id}`) || getProtocolColor(id)))

    // update colors cache
    for (let idx = 0; idx < ids.length; idx++) {
      cache.set(`color-${ids[idx]}`, colors[idx], 0)
    }
  }

  return success(
    {
      protocols: protocols.map((protocol, idx) => ({ ...protocol, color: colors[idx] })),
    },
    { maxAge: 60 * 60 },
  )
}
