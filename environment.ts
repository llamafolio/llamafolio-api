import 'dotenv/config'

import { z } from 'zod'

export const environmentSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]).default('development'),
  STAGE: z.union([z.literal('dev'), z.literal('prod'), z.literal('local')]).optional(),
  PGHOST: z.string().optional(),
  PGUSER: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGPORT: z.string().optional(),
  LLAMANODES_API_KEY: z.string().optional(),
  ANKR_API_KEY: z.string().optional().default(''),
  ARBITRUM_RPC: z.string().optional(),
  OPTIMISM_RPC: z.string().optional(),
  IS_OFFLINE: z.literal('true').or(z.literal('false')).optional(),
  API_URL: z.string().optional(),
  AWS_GATEWAY_API_ID_DEV: z.string().optional(),
  AWS_GATEWAY_API_ID_PROD: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  //
  R2_BUCKET_URL: z.string().optional(),
  NFTPORT_API_KEY: z.string().optional(),
  OPENSEA_API_KEY: z.string().optional(),
  ALCHEMY_API_KEY: z.string().optional(),
  NFTSCAN_API_KEY: z.string().optional(),
  INFURA_API_KEY: z.string().optional(),
  INFURA_API_KEY_SECRET: z.string().optional(),
})

export type Environment = z.infer<typeof environmentSchema>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Environment {}
  }
}

export const environment: Environment = environmentSchema.parse(process.env)

export default environment
