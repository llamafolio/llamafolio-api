import env from '@env'
import { Pool } from 'pg'

const connectionString = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`

// See: https://gist.github.com/streamich/6175853840fb5209388405910c6cc04b
const pool = new Pool({
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  connectionString,
})

export default pool
