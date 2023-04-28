import { AwsGatewayApiId, AwsStage } from './constants'

export const getApiGatewayURL = (awsStage: AwsStage = 'development') =>
  `https://${AwsGatewayApiId[awsStage]}.execute-api.${process.env.AWS_REGION}.amazonaws.com`

export const getApiURL = (stage: AwsStage | 'local') =>
  stage === 'local' ? 'http://localhost:3034' : getApiGatewayURL(stage)
