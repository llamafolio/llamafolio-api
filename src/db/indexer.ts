import { Pool } from "pg";
import env from "../../env";

// See: https://gist.github.com/streamich/6175853840fb5209388405910c6cc04b
// connection details inherited from environment
const pool = new Pool({
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  host: env.INDEXER_PGHOST,
  user: env.INDEXER_PGUSER,
  database: env.INDEXER_PGDATABASE,
  password: env.INDEXER_PGPASSWORD,
  port: env.INDEXER_PGPORT,
});

export default pool;
