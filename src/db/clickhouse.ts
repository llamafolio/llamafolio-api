import { createClient } from '@clickhouse/client'
import environment from '@environment'

Object.defineProperties(BigInt.prototype, {
  toJSON: {
    value: function (this: bigint) {
      return this.toString()
    },
    configurable: true,
  },
})

// Initialize client outside of Lambda handlers to reuse TCP/IP connection
export const client = createClient({
  host: environment.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: environment.CLICKHOUSE_USER || 'default',
  password: environment.CLICKHOUSE_PASSWORD || '',
  keep_alive: {
    enabled: true,
    socket_ttl: 2500,
    retry_on_expired_socket: true,
  },
  clickhouse_settings: {
    max_threads: 16,
    async_insert: 1,
    wait_for_async_insert: 1,
    enable_lightweight_delete: 1,
  },
})
