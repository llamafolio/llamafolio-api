import type { AwsStage } from './constants'
import { AwsGatewayApiId } from './constants'

export const getApiURL = (stage: AwsStage | 'local') =>
  stage === 'local'
    ? 'http://localhost:3034'
    : `https://${AwsGatewayApiId[stage]}.execute-api.${process.env.AWS_REGION}.amazonaws.com`
