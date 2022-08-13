import path from "path";
import format from "pg-format";
import pool from "../src/db/pool";
import { Adapter } from "../src/lib/adapter";
import { strToBuf } from "../src/lib/buf";

function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-adapter.ts
  // argv[2]: adapter
  if (process.argv.length < 3) {
    console.error("Missing adapter argument");
    return help();
  }

  const module = await import(
    path.join(__dirname, "..", "src", "adapters", process.argv[2])
  );
  const adapter = module.default as Adapter;

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
      data,
    ]
  );

  const client = await pool.connect();

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
    await client.query(
      format(
        "INSERT INTO adapters_contracts (adapter_id, chain, address, data) VALUES %L;",
        insertAdapterContractsValues
      ),
      []
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Failed to revalidate adapter contracts", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to revalidate adapter contracts",
      }),
    };
  } finally {
    client.release(true);
  }
}

main();
