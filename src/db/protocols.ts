import { IProtocol } from '@lib/protocols'
import { PoolClient } from 'pg'

export async function selectProtocols(): Promise<IProtocol[]> {
  return []
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function insertProtocols(client: PoolClient, protocols: IProtocol[]) {}
