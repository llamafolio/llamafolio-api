import { InvokeCommand, LambdaClient, LogType } from '@aws-sdk/client-lambda'

type InvocationType = 'RequestResponse' | 'Event' | 'DryRun'

export async function invokeLambda(functionName: string, event: any, invocationType?: InvocationType) {
  if (process.env.IS_OFFLINE) {
    return
  }

  const client = new LambdaClient({ region: 'eu-central-1' })
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(event)),
    InvocationType: invocationType,
    LogType: LogType.Tail,
  })

  const { Payload, LogResult } = await client.send(command)
  const result = Buffer.from(Payload || '').toString()
  const logs = Buffer.from(LogResult || '', 'base64').toString()

  return { logs, result }
}

export function wrapScheduledLambda(lambdaFunc: any): any {
  if (process.env.stage !== 'prod') {
    return () => {
      console.log('This lambda is getting ignored, stage is not prod')
    }
  }
  return lambdaFunc
}
