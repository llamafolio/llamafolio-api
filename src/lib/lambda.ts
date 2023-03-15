import { APIGatewayProxyHandler } from 'aws-lambda'
import aws from 'aws-sdk'

type InvocationType = 'RequestResponse' | 'Event' | 'DryRun'

export function invokeLambda(functionName: string, event: any, invocationType?: InvocationType) {
  if (process.env.IS_OFFLINE) {
    return
  }

  return new Promise((resolve) => {
    new aws.Lambda({
      endpoint: process.env.IS_OFFLINE ? 'http://localhost:3002' : undefined,
    }).invoke(
      {
        FunctionName: functionName,
        InvocationType: invocationType || 'Event',
        Payload: JSON.stringify(event, null, 2), // pass params
      },
      function (error, data) {
        console.log(error, data)
        resolve(data)
      },
    )
  })
}

export function wrapScheduledLambda(lambdaFunc: APIGatewayProxyHandler): APIGatewayProxyHandler {
  if (process.env.stage !== 'prod') {
    return () => {
      console.log('This lambda is getting ignored, stage is not prod')
    }
  }
  return lambdaFunc
}
