import pool from "@db/pool";
import { isHex, strToBuf } from "@lib/buf";
import { badRequest, notFound, serverError, success } from "./response";

export async function handler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const address = event.queryStringParameters?.address;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  const client = await pool.connect();

  try {
    const adaptersContractsRes = await client.query(
      `select adapter_id as id, chain from adapters_contracts where address = $1::bytea;`,
      [strToBuf(address)]
    );

    if (adaptersContractsRes.rows.length === 0) {
      return notFound();
    }

    return success({ data: adaptersContractsRes.rows });
  } catch (e) {
    console.error("Failed to retrieve adapters", e);
    return serverError("Failed to retrieve adapters");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}
