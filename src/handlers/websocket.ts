import { APIGatewayProxyHandler } from "aws-lambda";
import { ApiGatewayManagementApi, DynamoDB } from "aws-sdk";
import { invokeLambda } from "@lib/lambda";
import { isHex } from "@lib/buf";
import { badRequest, success } from "./response";

export const handleRequests: APIGatewayProxyHandler = async (event) => {
  const dynamodb = new DynamoDB.DocumentClient();
  const TableName = process.env.tableName!;
  const {
    body,
    requestContext: { connectionId, routeKey },
  } = event;

  const PK = `CI#${connectionId}`;
  const SK = `CI#${connectionId}`;

  switch (routeKey) {
    case "$connect":
      // 1 hour ttl
      const ttl = Math.ceil(new Date().getTime() / 1000) + 3600;

      await dynamodb
        .put({
          TableName,
          Item: { PK, SK, ttl },
        })
        .promise();
      break;

    case "$disconnect":
      await dynamodb
        .delete({
          TableName,
          Key: { PK, SK },
        })
        .promise();
      break;

    case "updateBalances":
      const payload = JSON.parse(body).data;
      const address = payload.address;
      if (!address) {
        return badRequest("Missing address parameter");
      }
      if (!isHex(address)) {
        return badRequest("Invalid address parameter, expected hex");
      }

      await invokeLambda(
        `llamafolio-api-${process.env.stage}-websocketUpdateBalances`,
        {
          connectionId: connectionId,
          address,
        }
      );
      break;

    case "getSyncStatus":
      await invokeLambda(
        `llamafolio-api-${process.env.stage}-websocketGetSyncStatus`,
        { connectionId: connectionId }
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

  return success({});
};
