import path from "path";
import format from "pg-format";
import pool from "../src/db/pool";
import {
  Adapter,
  BaseContext,
  BaseContract,
  PricedBalance,
} from "../src/lib/adapter";
import { strToBuf, bufToStr } from "../src/lib/buf";
import { getPricedBalances } from "../src/lib/price";

function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-adapter.ts
  // argv[2]: adapter
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
    const adaptersContractsRes = await client.query(
      "select * from adapters_contracts where adapter_id = $1;",
      [adapter.id]
    );

    const contracts: BaseContract[] = adaptersContractsRes.rows.map(
      (row: any) => ({
        chain: row.chain,
        address: bufToStr(row.address),
        ...row.data,
      })
    );

    console.log("Update adapter balances", {
      adapterId: adapter.id,
      address,
    });

    const balancesConfig = await adapter.getBalances(ctx, contracts || []);

    const pricedBalances = await getPricedBalances(balancesConfig.balances);

    console.log("Found balances", {
      adapterId: adapter.id,
      address,
      pricedBalances,
    });

    const now = new Date();

    // insert balances
    const insertBalancesValues = pricedBalances.map((d) => [
      strToBuf(address),
      d.chain,
      strToBuf(d.address),
      d.symbol,
      d.decimals,
      d.amount.toString(),
      d.category,
      adapter.id,
      (d as PricedBalance).price,
      (d as PricedBalance).timestamp
        ? new Date((d as PricedBalance).timestamp)
        : undefined,
      now,
      d.reward,
      d.debt,
      d.stable,
      d.parent ? strToBuf(d.parent) : undefined,
      d.claimable?.toString(),
    ]);

    await client.query("BEGIN");

    // Delete old balances
    await client.query(
      "delete from balances where from_address = $1::bytea and adapter_id = $2",
      [strToBuf(address), adapter.id]
    );

    // Insert new balances
    await client.query(
      format(
        "INSERT INTO balances (from_address, chain, address, symbol, decimals, amount, category, adapter_id, price, price_timestamp, timestamp, reward, debt, stable, parent, claimable) VALUES %L;",
        insertBalancesValues
      ),
      []
    );

    await client.query("COMMIT");
  } catch (e) {
    console.log("Failed to update balances", e);
    await client.query("ROLLBACK");
  } finally {
    client.release(true);
  }
}

main();
