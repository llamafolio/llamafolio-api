import 'dotenv/config'

import { z } from 'zod'

export const environmentSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]).default('development'),
  STAGE: z.union([z.literal('dev'), z.literal('prod'), z.literal('local')]).optional(),
  DDB_TABLE_NAME: z.string().optional(),
  PGHOST: z.string(),
  PGUSER: z.string(),
  PGDATABASE: z.string(),
  PGPASSWORD: z.string(),
  PGPORT: z.string(),
  CUSTOM_PROVIDER: z.string().optional(),
  LLAMANODES_API_KEY: z.string(),
  ARBITRUM_RPC: z.string().optional(),
  OPTIMISM_RPC: z.string().optional(),
  IS_OFFLINE: z.literal('true').or(z.literal('false')).optional(),
  API_URL: z.string().optional(),
  AWS_GATEWAY_API_ID_DEV: z.string().optional(),
  AWS_GATEWAY_API_ID_PROD: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
})

export type Environment = z.infer<typeof environmentSchema>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Environment {}
  }
}

export const environment: Environment = environmentSchema.parse(process.env)

export default environment
