import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '@env'
import Redis from 'ioredis'

export const client = new Redis({
  port: REDIS_PORT,
  host: REDIS_HOST,
  username: 'default',
  password: REDIS_PASSWORD,
  db: 0,
})
