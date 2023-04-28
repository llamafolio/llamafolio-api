export const possibleParameters = ['address', 'chain'] as const

export const possibleQueryParameters = [] as const

export const awsStages = {
  development: 'dev',
  production: 'prod',
}

export type AwsStage = keyof typeof awsStages

export const AwsGatewayApiId: { [key in AwsStage]: string } = {
  development: process.env.AWS_GATEWAY_API_ID_DEV,
  production: process.env.AWS_GATEWAY_API_ID_PROD,
}
