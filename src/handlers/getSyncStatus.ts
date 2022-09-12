import { APIGatewayProxyHandler } from "aws-lambda";
import { ApiGatewayManagementApi } from "aws-sdk";
import { providers } from "@defillama/sdk/build/general";
import pool from "@db/pool";
import { serverError, success } from "@handlers/response";

export const websocketHandler: APIGatewayProxyHandler = async (
  event,
  context
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const { connectionId } = event;

  const client = await pool.connect();

  try {
    const blocksSyncedRes = await client.query(
      `select * from blocks_synced();`,
      []
    );

    const blocksSynced = await Promise.all(
      blocksSyncedRes.rows.map(async (row) => {
        const count = parseInt(row.count);
        const max = parseInt(row.max);

        const res = { ...row, count, max };

        const chain = row.chain;
        const provider = providers[chain];
        if (!provider) {
          return res;
        }

        const blockNumber = await provider.getBlockNumber();

        res.blockNumber = blockNumber;
        res.offsetHead = blockNumber - max;
        res.missing = blockNumber - count;
        return res;
      })
    );

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
      endpoint: process.env.APIG_ENDPOINT,
    });

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          event: "getSyncStatus",
          data: blocksSynced,
        }),
      })
      .promise();

    return success({});
  } catch (e) {
    console.error("Failed to retrieve balances", e);
    return serverError("Failed to retrieve balances");
  } finally {
    client.release(true);
  }
};
