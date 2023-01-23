import env from '@env'
import { AWS_ENDPOINT, isOffline } from '@utility/serverless'
import AWS from 'aws-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'

interface LlamaDynamoDB {
  get: (
    key: AWS.DynamoDB.DocumentClient.Key,
    params?: Omit<AWS.DynamoDB.DocumentClient.GetItemInput, 'TableName'>,
  ) => Promise<PromiseResult<AWS.DynamoDB.DocumentClient.GetItemOutput, AWS.AWSError>>
  query: (
    params: Omit<AWS.DynamoDB.DocumentClient.QueryInput, 'TableName'>,
  ) => Promise<PromiseResult<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError>>
  batchGet: (
    keys: AWS.DynamoDB.DocumentClient.KeyList,
  ) => Promise<PromiseResult<AWS.DynamoDB.DocumentClient.BatchGetItemOutput, AWS.AWSError>>
  put: (
    item: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap,
    params?: Partial<AWS.DynamoDB.DocumentClient.PutItemInput>,
  ) => Promise<PromiseResult<AWS.DynamoDB.DocumentClient.PutItemOutput, AWS.AWSError>>
  delete: (
    key: AWS.DynamoDB.DocumentClient.Key,
    params?: Omit<AWS.DynamoDB.DocumentClient.DeleteItemInput, 'TableName'>,
  ) => Promise<PromiseResult<AWS.DynamoDB.DocumentClient.DeleteItemOutput, AWS.AWSError>>
}

export interface GetKey {
  PK: string
  SK: string
}
export interface QueryKey {
  PK: string
}

export const TableName = env.DDB_TABLE_NAME!

export let dynamodb: LlamaDynamoDB | undefined = undefined

if (!isOffline) {
  const client = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1',
    endpoint: AWS_ENDPOINT,
  })

  dynamodb = {
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
} else {
  console.log('DynamoDB was not initialized in serverless offline')
}
