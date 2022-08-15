import pool from "@db/pool";
import { isHex, strToBuf } from "@lib/buf";

export async function handler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const address = event.queryStringParameters?.address;
  if (!address) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing address parameter",
      }),
    };
  }
  if (!isHex(address)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid address parameter, expected hex",
      }),
    };
  }

  const client = await pool.connect();

  try {
    const adaptersContractsRes = await client.query(
      `select adapter_id as id, chain from adapters_contracts where address = $1::bytea;`,
      [strToBuf(address)]
    );

    if (adaptersContractsRes.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          data: [],
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: adaptersContractsRes.rows,
      }),
    };
  } catch (e) {
    console.error("Failed to retrieve adapters", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retrieve adapters",
      }),
    };
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}
