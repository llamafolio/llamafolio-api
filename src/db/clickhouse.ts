import { createClient } from '@clickhouse/client'

Object.defineProperties(BigInt.prototype, {
  toJSON: {
    value: function (this: bigint) {
      return this.toString()
    },
  },
})

let client: ReturnType<typeof createClient> | undefined

export function connect() {
  if (!client) {
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
        enable_lightweight_delete: 1,
      },
    })
  }

  return client
}
