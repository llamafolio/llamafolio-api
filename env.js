/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-var-requires */

try {
  require('dotenv').config()
} catch (e) {}
module.exports = {
  PGHOST: process.env.PGHOST,
  PGUSER: process.env.PGUSER,
  PGDATABASE: process.env.PGDATABASE,
  PGPASSWORD: process.env.PGPASSWORD,
  PGPORT: parseInt(process.env.PGPORT),
  LLAMANODES_API_KEY: process.env.LLAMANODES_API_KEY,
  INDEXER_ACCESS_TOKEN: process.env.INDEXER_ACCESS_TOKEN,
}
