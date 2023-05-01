import type { Chain } from '@lib/chains'

export const possibleParameters = ['address', 'chain'] as const

export const possibleQueryParameters = [] as const

export type AwsStage = 'prod' | 'dev'

export const AwsGatewayApiId = {
  dev: process.env.AWS_GATEWAY_API_ID_DEV,
  prod: process.env.AWS_GATEWAY_API_ID_PROD,
} satisfies { [key in AwsStage]: string }

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
