import { APIGatewayProxyHandler } from "aws-lambda";
import pool from "@db/pool";
import { isHex, strToBuf } from "@lib/buf";
import { badRequest, notFound, serverError, success } from "./response";

export const getContract: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const address = event.pathParameters?.address;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  const client = await pool.connect();

  try {
    const adaptersContractsRes = await client.query(
      `select adapter_id, chain, data -> 'name' as name, data -> 'displayName' as display_name from adapters_contracts where address = $1::bytea;`,
      [strToBuf(address)]
    );

    if (adaptersContractsRes.rows.length === 0) {
      return notFound();
    }

    return success(
      {
        data: {
          // TODO: resolve name in case multiple adapters use the same contract
          name: adaptersContractsRes.rows[0].name,
          display_name: adaptersContractsRes.rows[0].display_name,
          adapters: adaptersContractsRes.rows.map((row) => ({
            id: row.adapter_id,
            chain: row.chain,
          })),
        },
      },
      { maxAge: 2 * 60 }
    );
  } catch (e) {
    console.error("Failed to retrieve adapters", e);
    return serverError("Failed to retrieve adapters");
  } finally {
    client.release(true);
  }
};
