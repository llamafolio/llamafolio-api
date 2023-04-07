import env from '@env'
import { Pool } from 'pg'

const conn = `postgresql://${env.PGUSER2}:${env.PGPASSWORD2}@${env.PGHOST2}:${env.PGPORT2}/${env.PGDATABASE2}`

// See: https://gist.github.com/streamich/6175853840fb5209388405910c6cc04b
const pool = new Pool({
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  connectionString: env.PGPASSWORD2 ? conn : undefined,
})

export default pool
