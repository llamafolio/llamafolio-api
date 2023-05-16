import { InvokeCommand, LambdaClient, LogType } from '@aws-sdk/client-lambda'
import environment from '@environment'

const { STAGE } = environment

type LambdaFunctionName = 'revalidateAdapterContracts' | 'updateBalances' | 'updateProtocols' | 'updateYields'

type InvocationType = 'RequestResponse' | 'Event' | 'DryRun'

const lambdaFunctionNames: { [key in LambdaFunctionName]: string } = {
  revalidateAdapterContracts: `llamafolio-api-${STAGE}-revalidateAdapterContracts`,
  updateBalances: `llamafolio-api-${STAGE}-updateBalances`,
  updateProtocols: `llamafolio-api-${STAGE}-updateProtocols`,
  updateYields: `llamafolio-api-${STAGE}-updateYields`,
}

export async function invokeLambda(functionName: LambdaFunctionName, event: any, invocationType?: InvocationType) {
  if (process.env.IS_OFFLINE) {
    return
  }

  const client = new LambdaClient({ region: 'eu-central-1' })
  const command = new InvokeCommand({
    FunctionName: lambdaFunctionNames[functionName],
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
  if (STAGE !== 'prod') {
    return () => {
      console.log('This lambda is getting ignored, stage is not prod')
    }
  }
  return lambdaFunc
}
