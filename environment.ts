import 'dotenv/config'

import { z } from 'zod'

export const environmentSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]),
  STAGE: z.union([z.literal('dev'), z.literal('prod'), z.literal('local')]),
  DDB_TABLE_NAME: z.string().optional(),
  PGHOST: z.string(),
  PGUSER: z.string(),
  PGDATABASE: z.string(),
  PGPASSWORD: z.string(),
  PGPORT: z.string(),
  REDIS_PORT: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  INDEXER_ADMIN_TOKEN: z.string(),
  CUSTOM_PROVIDER: z.string(),
  LLAMANODES_API_KEY: z.string(),
  ARBITRUM_RPC: z.string(),
  OPTIMISM_RPC: z.string(),
  IS_OFFLINE: z.literal('true').or(z.literal('false')).optional(),
  API_URL: z.string().optional(),
})

export type Environment = z.infer<typeof environmentSchema>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Environment {}
  }
}

export const environment: Environment = environmentSchema.parse(process.env)

export default environment
