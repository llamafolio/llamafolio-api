import path from "path";
import fetch from "node-fetch";
import { toDefiLlama } from "../src/lib/chain";
import {
  Adapter,
  Balance,
  BaseContext,
  PricedBalance,
} from "../src/lib/adapter";

function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: run-adapter.ts
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

  const contractsRes = await adapter.getContracts();

  const balancesRes = await adapter.getBalances(ctx, contractsRes.contracts);

  let balances = balancesRes.balances;

  //console.log("All balances:", JSON.stringify(balances));

  // Filter empty nbalances
  balances = balances.filter((balance) => balance.amount.gt(0));

  const pricesRes = await fetch("https://coins.llama.fi/prices", {
    method: "POST",
    body: JSON.stringify({
      coins: balances.map(
        (balance) =>
          `${toDefiLlama(balance.chain)}:${balance.address.toLowerCase()}`
      ),
    }),
  });
  const prices = await pricesRes.json();

  const pricedBalances: (Balance | PricedBalance)[] = balances.map(
    (balance) => {
      const key = `${balance.chain}:${balance.address.toLowerCase()}`;
      const price = prices.coins[key];
      if (price !== undefined) {
        const balanceAmount = balance.amount / 10 ** balance.decimals;

        return {
          ...balance,
          decimals: price.decimals,
          price: price.price,
          balanceUSD: balanceAmount * price.price,
          symbol: price.symbol,
          timestamp: price.timestamp,
        };
      } else {
        // TODO: Mising price and token info from Defillama API
        console.log(
          `Failed to get price on Defillama API for ${balance.chain}:${balance.address}`
        );
      }
      return balance;
    }
  );

  for (let index = 0; index < pricedBalances.length; index++) {
    const balance = pricedBalances[index];
    console.log(
      `Category ${balance.category} :: Token: ${balance.symbol} :: Balance is ${
        balance.amount / 10 ** balance.decimals
      } :: Balance $${balance.balanceUSD}`
    );
  }
}

main();
