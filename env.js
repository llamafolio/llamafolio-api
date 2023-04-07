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
  PGHOST2: process.env.PGHOST2,
  PGUSER2: process.env.PGUSER2,
  PGDATABASE2: process.env.PGDATABASE2,
  PGPASSWORD2: process.env.PGPASSWORD2,
  PGPORT2: parseInt(process.env.PGPORT2),
  INDEXER_ADMIN_TOKEN: process.env.INDEXER_ADMIN_TOKEN,
  // RPCs
  CUSTOM_PROVIDER: process.env.CUSTOM_PROVIDER,
  LLAMANODES_API_KEY: process.env.LLAMANODES_API_KEY,
  ARBITRUM_RPC: process.env.ARBITRUM_RPC,
  OPTIMISM_RPC: process.env.OPTIMISM_RPC,
}
