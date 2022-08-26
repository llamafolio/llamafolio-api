import format from "pg-format";
import pool from "@db/pool";
import { adapters } from "@adapters/index";
import { invokeLambda, wrapScheduledLambda } from "@lib/lambda";
import { strToBuf } from "@lib/buf";
import { sliceIntoChunks } from "@lib/array";
import { serverError, success } from "./response";

async function revalidateAdaptersContracts(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const client = await pool.connect();

  try {
    const [expiredAdaptersRes, adapterIdsRes] = await Promise.all([
      client.query(
        `select distinct(id) from adapters where contracts_expire_at <= now();`,
        []
      ),
      client.query(`select id from adapters;`, []),
    ]);

    const adapterIds = new Set(adapterIdsRes.rows.map((row) => row.id));

    const revalidateAdapterIds = new Set();

    // revalidate expired adapters
    for (const row of expiredAdaptersRes.rows) {
      revalidateAdapterIds.add(row.id);
    }

    // revalidate new adapters (not stored in our DB yet)
    for (const adapter of adapters) {
      if (!adapterIds.has(adapter.id)) {
        revalidateAdapterIds.add(adapter.id);
      }
    }

    const revalidateAdapterIdsArr = [...revalidateAdapterIds];

    if (revalidateAdapterIdsArr.length > 0) {
      // Run adapters "getContracts" in Lambdas
      for (const adapterId of revalidateAdapterIdsArr) {
        invokeLambda(
          `llamafolio-api-${process.env.stage}-revalidateAdapterContracts`,
          {
            adapterId,
          }
        );
      }
    }

    return success({
      data: revalidateAdapterIdsArr,
    });
  } catch (e) {
    console.error("Failed to revalidate adapters contracts", e);
    return serverError("Failed to revalidate adapters contracts");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}

export const scheduledRevalidateAdaptersContracts = wrapScheduledLambda(
  revalidateAdaptersContracts
);

export async function revalidateAdapterContracts(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const client = await pool.connect();

  const adapter = adapters.find((adapter) => adapter.id === event.adapterId);
  if (!adapter) {
    console.error(
      `Failed to revalidate adapter contracts, could not find adapter with id: ${event.adapterId}`
    );
    return serverError(
      `Failed to revalidate adapter contracts, could not find adapter with id: ${event.adapterId}`
    );
  }

  const config = await adapter.getContracts();

  let expire_at: Date | null = null;
  if (config.revalidate) {
    expire_at = new Date();
    expire_at.setSeconds(expire_at.getSeconds() + config.revalidate);
  }

  const deleteOldAdapterContractsValues = [[adapter.id]];

  const insertAdapterValues = [[adapter.id, expire_at]];

  const insertAdapterContractsValues = config.contracts.map(
    ({ chain, address, ...data }) => [
      adapter.id,
      chain,
      strToBuf(address),
      // \\u0000 cannot be converted to text
      JSON.parse(JSON.stringify(data).replace(/\\u0000/g, "")),
    ]
  );

  try {
    await client.query("BEGIN");

    // Delete old contracts
    await client.query(
      format(
        "DELETE FROM adapters_contracts WHERE adapter_id IN %L;",
        deleteOldAdapterContractsValues
      ),
      []
    );

    // Insert adapter if not exists
    await client.query(
      format(
        "INSERT INTO adapters (id, contracts_expire_at) VALUES %L ON CONFLICT DO NOTHING;",
        insertAdapterValues
      ),
      []
    );

    // Insert new contracts
    await Promise.all(
      sliceIntoChunks(insertAdapterContractsValues, 200).map((chunk) =>
        client.query(
          format(
            "INSERT INTO adapters_contracts (adapter_id, chain, address, data) VALUES %L ON CONFLICT DO NOTHING;",
            chunk
          ),
          []
        )
      )
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Failed to revalidate adapter contracts", e);
    return serverError("Failed to revalidate adapter contracts");
  } finally {
    client.release(true);
  }
}
