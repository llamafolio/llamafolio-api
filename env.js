try {
  require("dotenv").config();
} catch (e) {}
module.exports = {
  DB_PGHOST: process.env.DB_PGHOST,
  DB_PGUSER: process.env.DB_PGUSER,
  DB_PGDATABASE: process.env.DB_PGDATABASE,
  DB_PGPASSWORD: process.env.DB_PGPASSWORD,
  DB_PGPORT: parseInt(process.env.DB_PGPORT),
  INDEXER_PGHOST: process.env.INDEXER_PGHOST,
  INDEXER_PGUSER: process.env.INDEXER_PGUSER,
  INDEXER_PGDATABASE: process.env.INDEXER_PGDATABASE,
  INDEXER_PGPASSWORD: process.env.INDEXER_PGPASSWORD,
  INDEXER_PGPORT: parseInt(process.env.INDEXER_PGPORT),
};
