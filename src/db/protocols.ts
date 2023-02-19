import { IProtocolLite } from '@lib/protocols'
import { Redis } from 'ioredis'

export const PROTOCOLS_KEY = 'protocols'

export async function selectProcols(client: Redis): Promise<IProtocolLite[]> {
  const protocols = await client.get(PROTOCOLS_KEY)
  if (!protocols) {
    return []
  }

  return JSON.parse(protocols)
}

export async function insertProtocols(client: Redis, protocols: IProtocolLite[]) {
  return client.set(PROTOCOLS_KEY, JSON.stringify(protocols))
}
