import type { AwsStage } from './constants'
import { AwsGatewayApiId } from './constants'

// TODO: should probably move this to `src/config
export const getApiGatewayURL = (awsStage: AwsStage = 'dev') =>
  `https://${AwsGatewayApiId[awsStage]}.execute-api.${process.env.AWS_REGION}.amazonaws.com`

export const getApiURL = (stage: AwsStage | 'local') =>
  stage === 'local' ? 'http://localhost:3034' : getApiGatewayURL(stage)
