import env from '@env'
import { sliceIntoChunks } from '@lib/array'
import AWS from 'aws-sdk'

const client = new AWS.DynamoDB.DocumentClient({
  region: 'eu-central-1',
})
export const TableName = env.DDB_TABLE_NAME!

export interface GetKey {
  PK: string
  SK: string
}
export interface QueryKey {
  PK: string
}

export const dynamodb = {
  get: (key: AWS.DynamoDB.DocumentClient.Key, params?: Omit<AWS.DynamoDB.DocumentClient.GetItemInput, 'TableName'>) =>
    client.get({ TableName, ...params, Key: key }).promise(),
  query: (params: Omit<AWS.DynamoDB.DocumentClient.QueryInput, 'TableName'>) =>
    client.query({ TableName, ...params }).promise(),
  batchGet: (keys: AWS.DynamoDB.DocumentClient.KeyList) => {
    return client
      .batchGet({
        RequestItems: {
          [TableName]: {
            Keys: keys,
          },
        },
      })
      .promise()
  },
  put: (
    item: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap,
    params?: Partial<AWS.DynamoDB.DocumentClient.PutItemInput>,
  ) => client.put({ TableName, ...params, Item: item }).promise(),
  delete: (
    key: AWS.DynamoDB.DocumentClient.Key,
    params?: Omit<AWS.DynamoDB.DocumentClient.DeleteItemInput, 'TableName'>,
  ) => client.delete({ TableName, ...params, Key: key }).promise(),
}

export async function batchGet(keys: GetKey[]) {
  const results: any[] = []

  let requestsIdx = 0
  // max batch length: 100
  const requests = sliceIntoChunks(keys, 100)
  let retryCount = 0

  while (requestsIdx < requests.length) {
    if (retryCount > 3) {
      throw new Error(`Failed to get keys from DynamoDB, max attempt reached`)
    }

    const responses = await Promise.all(requests.map((keys) => dynamodb.batchGet(keys)))

    for (const response of responses) {
      if (response.Responses?.[TableName]) {
        for (const item of response.Responses[TableName]) {
          results.push(item)
        }
      }

      const unprocessedRequests: GetKey[] = []
      if (response.UnprocessedKeys?.[TableName]?.Keys) {
        for (const item of response.UnprocessedKeys[TableName].Keys) {
          unprocessedRequests.push(item as GetKey)
        }
      }

      if (unprocessedRequests.length > 0) {
        retryCount++
        requests.push(unprocessedRequests)
      }
    }

    requestsIdx++
  }

  return results
}
