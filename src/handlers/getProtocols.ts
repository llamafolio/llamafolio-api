import { success } from '@handlers/response'
import { Cache } from '@lib/cache'
import { fetchProtocolsLite, IProtocolLite } from '@lib/protocols'
import { APIGatewayProxyHandler } from 'aws-lambda'

type CacheKeys = 'protocols'

const cache = new Cache<CacheKeys, IProtocolLite[]>()

export const handler: APIGatewayProxyHandler = async (event) => {
  const queries = event.queryStringParameters

  let protocols: IProtocolLite[] | null = cache.get('protocols')
  if (!protocols) {
    protocols = await fetchProtocolsLite()
    cache.set('protocols', protocols, 0)
  }

  if (queries?.ids) {
    const ids = new Set(queries.ids.split(','))
    protocols = protocols.filter((protocol) => ids.has(protocol.slug))
  }

  return success(
    {
      protocols,
    },
    { maxAge: 60 * 60 },
  )
}
