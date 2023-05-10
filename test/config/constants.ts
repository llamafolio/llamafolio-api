import type { Chain } from '@lib/chains'

export type AwsStage = 'prod' | 'dev'

export const AwsGatewayApiId = {
  dev: process.env.AWS_GATEWAY_API_ID_DEV,
  prod: process.env.AWS_GATEWAY_API_ID_PROD,
}

export const chains = [
  'arbitrum',
  'avalanche',
  'bsc',
  'ethereum',
  'fantom',
  'gnosis',
  'harmony',
  'optimism',
  'polygon',
] satisfies ReadonlyArray<Chain>
