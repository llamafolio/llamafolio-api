import 'dotenv/config'

/* https://github.com/arktypeio/arktype */
import { type } from 'arktype'

const { assert: environmentSchema } = type({
  NODE_ENV: "'development' | 'production' | 'test'",
  'STAGE?': "'dev' | 'prod' | 'local'",
  'DDB_TABLE_NAME?': 'string',
  PGHOST: 'string',
  PGUSER: 'string',
  PGDATABASE: 'string',
  PGPASSWORD: 'string',
  PGPORT: 'string',
  PGCONNECTION_STRING: 'string',
  'CUSTOM_PROVIDER?': 'string',
  LLAMANODES_API_KEY: 'string',
  'ARBITRUM_RPC?': 'string',
  'OPTIMISM_RPC?': 'string',
  'IS_OFFLINE?': "'true' | 'false'",
  'ESBUILD_ANALYZE?': "'true' | 'false'",
  // used when testing
  'API_URL?': 'string',
  'AWS_REGION?': 'string',
  'AWS_GATEWAY_API_ID_DEV?': 'string',
  'AWS_GATEWAY_API_ID_PROD?': 'string',
  'TEST_WAIT_TIME?': 'string',
})

export type Environment = ReturnType<typeof environmentSchema>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Environment {}
  }
}

export const environment: Environment = environmentSchema(process.env)

export default environment
