import { APIGatewayProxyHandler } from "aws-lambda";
import { ApiGatewayManagementApi, DynamoDB, Lambda } from "aws-sdk";
import { invokeLambda } from "@lib/lambda";

export const handleRequests: APIGatewayProxyHandler = async (event) => {
  const dynamodb = new DynamoDB.DocumentClient();
  const TableName = process.env.tableName!;
  const {
    body,
    requestContext: { connectionId, routeKey },
  } = event;

  switch (routeKey) {
    case "$connect":
      // 1 hour ttl
      const ttl = Math.ceil(new Date().getTime() / 1000) + 3600;

      await dynamodb
        .put({
          TableName,
          Item: {
            PK: connectionId,
            SK: ttl,
          },
        })
        .promise();
      break;

    case "$disconnect":
      await dynamodb
        .delete({
          TableName,
          Key: { connectionId },
        })
        .promise();
      break;

    case "getBalances":
      const payload = JSON.parse(body).data;
      const address = payload.address;

      await invokeLambda(
        `llamafolio-api-${process.env.stage}-websocketGetBalances`,
        {
          connectionId: connectionId,
          address,
        }
      );
      break;

    case "$default":
    default:
      const apiGatewayManagementApi = new ApiGatewayManagementApi({
        endpoint: process.env.APIG_ENDPOINT,
      });

      await apiGatewayManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: `Action ${routeKey} is not supported`,
        })
        .promise();
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({}),
  };
};
