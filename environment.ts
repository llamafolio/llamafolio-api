import 'dotenv/config'

import { z } from 'zod'

export const environmentSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]).default('development'),
  STAGE: z.union([z.literal('dev'), z.literal('prod'), z.literal('local')]).optional(),
  CLICKHOUSE_HOST: z.string().optional(),
  CLICKHOUSE_USER: z.string().optional(),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  LLAMANODES_API_KEY: z.string().optional(),
  DEFILLAMA_LABELS_API_KEY: z.string().optional(),
  ANKR_API_KEY: z.string().optional().default(''),
  OPTIMISM_RPC: z.string().optional(),
  IS_OFFLINE: z.literal('true').or(z.literal('false')).optional(),
  API_URL: z.string().optional(),
  AWS_GATEWAY_API_ID_DEV: z.string().optional(),
  AWS_GATEWAY_API_ID_PROD: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),
  NFTPORT_API_KEY: z.string().optional(),
  OPENSEA_API_KEY: z.string().optional(),
  ALCHEMY_API_KEY: z.string().optional(),
  NFTSCAN_API_KEY: z.string().optional(),
  INFURA_API_KEY: z.string().optional(),
  INFURA_API_KEY_SECRET: z.string().optional(),
  CENTER_API_KEY: z.string().optional(),
  RESERVOIR_API_KEY: z.string().optional(),
  QUICKNODE_API_KEY: z.string().optional(),
  QUICKNODE_HTTP_URL: z.string().optional(),
  ELEMENT_API_KEY: z.string().optional(),
})

export type Environment = z.infer<typeof environmentSchema>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Environment {}
  }
}

export const environment: Environment = environmentSchema.parse(process.env)

export default environment
