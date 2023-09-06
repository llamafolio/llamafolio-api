import { createClient } from '@clickhouse/client'

Object.defineProperties(BigInt.prototype, {
  toJSON: {
    value: function (this: bigint) {
      return this.toString()
    },
    configurable: true,
  },
})

let client: ReturnType<typeof createClient> | undefined

export function connect() {
  if (!client) {
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      keep_alive: {
        enabled: true,
        // should be slightly less than the `keep_alive_timeout` setting in server's `config.xml`
        // default is 3s there, so 2500 milliseconds seems to be a safe client value in this scenario
        // another example: if your configuration has `keep_alive_timeout` set to 60s, you could put 59_000 here
        socket_ttl: 2500,
        // default: false
        retry_on_expired_socket: true,
      },
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
        enable_lightweight_delete: 1,
      },
    })
  }

  return client
}
