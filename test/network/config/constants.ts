export const possibleParameters = ['address', 'chain'] as const

export const possibleQueryParameters = [] as const

export type AwsStage = 'prod' | 'dev'

export const AwsGatewayApiId: { [key in AwsStage]: string } = {
  dev: process.env.AWS_GATEWAY_API_ID_DEV,
  prod: process.env.AWS_GATEWAY_API_ID_PROD,
}
