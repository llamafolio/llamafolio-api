import '@db/marshall'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { BatchGetCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import environment from '@environment'

const TableName = `${environment.STAGE}-llamafolio-table`

const marshallOptions = {
  // automatically convert empty strings, blobs, and sets to `null`.
  // convertEmptyValues: false, // false, by default.
  // remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // convert typeof object to map attribute.
  convertClassInstanceToMap: true,
}

const unmarshallOptions = {
  // return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
}

const translateConfig = { marshallOptions, unmarshallOptions }

let client: DynamoDBClient | null = null
let docClient: DynamoDBDocumentClient | null = null

export function getDocClient() {
  if (docClient) {
    return docClient
  }

  client = new DynamoDBClient({})
  docClient = DynamoDBDocumentClient.from(client, translateConfig)

  return docClient
}

export async function getItem(params: { PK: string; SK: string }) {
  const docClient = getDocClient()

  const command = new GetCommand({
    TableName,
    Key: params,
  })

  const response = await docClient.send(command)

  return response.Item
}

export async function getBatchItem<T>(params: { PK: string; SK: string }[]) {
  const docClient = getDocClient()

  const command = new BatchGetCommand({
    RequestItems: {
      [TableName]: { Keys: params },
    },
  })

  const response = await docClient.send(command)

  return (response.Responses?.[TableName] || []) as T[]
}

export function putItem(item: any, params?: any) {
  const docClient = getDocClient()

  const command = new PutCommand({
    TableName,
    ...params,
    Item: item,
  })

  return docClient.send(command)
}
