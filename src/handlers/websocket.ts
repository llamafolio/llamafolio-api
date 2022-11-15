import { apiGatewayManagementApi } from '@handlers/apiGateway'
import { badRequest, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { invokeLambda } from '@lib/lambda'
import { isNotNullish } from '@lib/type'
import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

export const handleRequests: APIGatewayProxyHandler = async (event) => {
  const dynamodb = new DynamoDB.DocumentClient()
  const TableName = process.env.tableName!
  const {
    body,
    requestContext: { connectionId, routeKey },
  } = event
  if (!isNotNullish(connectionId)) {
    return badRequest('Missing connectionId parameter')
  }

  const PK = `CI#${connectionId}`
  const SK = `CI#${connectionId}`

  switch (routeKey) {
    case '$connect':
      // 1 hour ttl
      const ttl = Math.ceil(new Date().getTime() / 1000) + 3600

      await dynamodb
        .put({
          TableName,
          Item: { PK, SK, ttl },
        })
        .promise()
      break

    case '$disconnect':
      await dynamodb
        .delete({
          TableName,
          Key: { PK, SK },
        })
        .promise()
      break

    case 'updateBalances':
      const payload = JSON.parse(body!)?.data
      const address = payload.address
      if (!address) {
        return badRequest('Missing address parameter')
      }
      if (!isHex(address)) {
        return badRequest('Invalid address parameter, expected hex')
      }

      await invokeLambda(`llamafolio-api-${process.env.stage}-websocketUpdateAdaptersBalances`, {
        connectionId: connectionId,
        address,
      })
      break

    case '$default':
    default:
      await apiGatewayManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: `Action ${routeKey} is not supported`,
        })
        .promise()
  }

  return success({})
}
