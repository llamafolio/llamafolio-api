import path from "path";
import pool from "../src/db/pool";
import { Adapter, BaseContext, BaseContract } from "../src/lib/adapter";
import { getPricedBalances } from "../src/lib/price";
import { fromStorage } from "../src/db/contracts";

function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: run-balances.ts
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
    const contractsRes = await client.query(
      "select * from contracts where adapter_id = $1;",
      [adapter.id]
    );

    const contracts: BaseContract[] = contractsRes.rows.map(fromStorage);

    const balancesConfig = await adapter.getBalances(ctx, contracts || []);

    const pricedBalances = await getPricedBalances(balancesConfig.balances);

    console.log(JSON.stringify(pricedBalances, null, 2));
  } catch (e) {
    console.log("Failed to run balances", e);
  } finally {
    client.release(true);
  }
}

main();
