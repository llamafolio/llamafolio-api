const { Pool } = require("pg");

// See: https://gist.github.com/streamich/6175853840fb5209388405910c6cc04b
// connection details inherited from environment
const pool = new Pool({
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
});

export default pool;
