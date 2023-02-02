/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-var-requires */

try {
  require('dotenv').config()
} catch (e) {}
module.exports = {
  STAGE: process.env.stage,
  DDB_TABLE_NAME: process.env.tableName,
  PGHOST: process.env.PGHOST,
  PGUSER: process.env.PGUSER,
  PGDATABASE: process.env.PGDATABASE,
  PGPASSWORD: process.env.PGPASSWORD,
  PGPORT: parseInt(process.env.PGPORT),
  REDIS_PORT: parseInt(process.env.REDIS_PORT),
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  LLAMANODES_API_KEY: process.env.LLAMANODES_API_KEY,
  INDEXER_ADMIN_TOKEN: process.env.INDEXER_ADMIN_TOKEN,
}
