import { providers } from "@defillama/sdk/build/general";
import pool from "@db/pool";

export async function handler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: blocksSynced,
      }),
    };
  } catch (e) {
    console.error("Failed to retrieve sync status", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retrieve sync status",
      }),
    };
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}
