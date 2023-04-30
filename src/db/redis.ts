import { environment } from '@environment'
import Redis from 'ioredis'

const { REDIS_PORT, REDIS_HOST, REDIS_PASSWORD } = environment

export const client = new Redis({
  port: Number(REDIS_PORT),
  host: REDIS_HOST,
  username: 'default',
  password: REDIS_PASSWORD,
  db: 0,
})
