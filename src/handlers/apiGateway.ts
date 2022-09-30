import { ApiGatewayManagementApi } from "aws-sdk";

export const apiGatewayManagementApi = new ApiGatewayManagementApi({
  endpoint: process.env.IS_OFFLINE
    ? `http://localhost:3001`
    : process.env.APIG_ENDPOINT,
});
