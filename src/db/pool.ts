import env from '@environment'
import pg from 'pg'

Object.defineProperties(BigInt.prototype, {
  toJSON: {
    value: function (this: bigint) {
      return this.toString()
    },
  },
})

const connectionString = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`

// See: https://gist.github.com/streamich/6175853840fb5209388405910c6cc04b
const pool = new pg.Pool({
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  connectionString,
})

export default pool
