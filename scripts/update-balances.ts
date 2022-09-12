import path from "path";
import { selectContractsByAdapterId } from "../src/db/contracts";
import pool from "../src/db/pool";
import { insertBalances } from "../src/db/balances";
import { Adapter, BaseContext } from "../src/lib/adapter";
import { strToBuf } from "../src/lib/buf";
import { getPricedBalances } from "../src/lib/price";

function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: update-balances.ts
  // argv[2]: adapter
  // argv[3]: address
  if (process.argv.length < 3) {
    console.error("Missing adapter argument");
    return help();
  }
  if (process.argv.length < 4) {
    console.error("Missing address argument");
    return help();
  }
  const address = process.argv[3].toLowerCase();

  const ctx: BaseContext = { address };

  const module = await import(
    path.join(__dirname, "..", "src", "adapters", process.argv[2])
  );
  const adapter = module.default as Adapter;

  const client = await pool.connect();

  try {
    const contracts = await selectContractsByAdapterId(client, adapter.id);

    console.log("Update adapter balances", {
      adapterId: adapter.id,
      address,
      contracts: contracts.length,
    });

    const balancesConfig = await adapter.getBalances(ctx, contracts || []);

    const pricedBalances = await getPricedBalances(balancesConfig.balances);

    console.log("Found balances", {
      adapterId: adapter.id,
      address,
      pricedBalances,
    });

    const now = new Date();

    await client.query("BEGIN");

    // Delete old balances
    await client.query(
      "delete from balances where from_address = $1::bytea and adapter_id = $2",
      [strToBuf(address), adapter.id]
    );

    // Insert new balances
    await insertBalances(client, pricedBalances, adapter.id, address, now);

    await client.query("COMMIT");
  } catch (e) {
    console.log("Failed to update balances", e);
    await client.query("ROLLBACK");
  } finally {
    client.release(true);
  }
}

main();
