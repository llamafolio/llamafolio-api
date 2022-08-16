import path from "path";
import fetch from "node-fetch";
import millify from "millify";

import {
  Adapter,
  Balance,
  BaseContext,
  PricedBalance,
  CategoryBalances,
} from "../src/lib/adapter";
import { Category } from "../src/lib/category";
import { getERC20Prices } from "../src/lib/price";

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
  // Filter empty balances
  balances = balances.filter((balance) => balance.amount.gt(0));

  const yieldsRes = await fetch("https://yields.llama.fi/pools");
  const yieldsData = (await yieldsRes.json()).data;

  const yieldsByPoolAddress: { [key: string]: any } = {};
  for (let i = 0; i < yieldsData.length; i++) {
    yieldsByPoolAddress[yieldsData[i].pool.toLowerCase()] = yieldsData[i];
  }

  const prices = await getERC20Prices(balances);

  const pricedBalances: (Balance | PricedBalance)[] = balances.map(
    (balance) => {
      const key = `${balance.chain}:${
        balance.priceSubstitute
          ? balance.priceSubstitute.toLowerCase()
          : balance.address.toLowerCase()
      }`;
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
        console.log(`Failed to get price on Defillama API for ${key}`);
      }
      return balance;
    }
  );

  console.log(`Found ${pricedBalances.length} non zero balances`);

  const data = [];

  // group by category
  const balancesByCategory: Partial<Record<Category, Balance[]>> = {};
  for (const balance of pricedBalances) {
    if (!balancesByCategory[balance.category]) {
      balancesByCategory[balance.category] = [];
    }
    balancesByCategory[balance.category].push(balance);
  }

  const categoriesBalances: CategoryBalances[] = [];
  for (const category in balancesByCategory) {
    const cat: CategoryBalances = {
      title: category,
      totalUSD: 0,
      balances: [],
    };

    for (const balance of balancesByCategory[category]) {
      cat.totalUSD += balance.balanceUSD || 0;
      cat.balances.push(balance);
    }

    // sort by balanceUSD
    cat.balances.sort((a, b) => {
      if (a.balanceUSD != null && b.balanceUSD == null) {
        return -1;
      }
      if (a.balanceUSD == null && b.balanceUSD != null) {
        return 1;
      }
      return b.balanceUSD - a.balanceUSD;
    });

    categoriesBalances.push(cat);
  }

  // sort categories by total balances
  categoriesBalances.sort((a, b) => b.totalUSD - a.totalUSD);

  for (const categoryBalances of categoriesBalances) {
    console.log(
      `Category: ${categoryBalances.title}, totalUSD: ${categoryBalances.totalUSD}`
    );

    const data: any[] = [];

    for (const balance of categoryBalances.balances) {
      const key = `${balance.yieldsAddress?.toLowerCase()}-${balance.chain}`;
      const subKey = `${balance.yieldsAddress?.toLowerCase()}`;
      const yieldObject =
        yieldsByPoolAddress[key] || yieldsByPoolAddress[subKey];

      data.push({
        address: balance.address,
        category: balance.category,
        symbol: balance.symbol,
        balance: millify(balance.amount / 10 ** balance.decimals),
        "balance usd": `$${millify(
          balance.balanceUSD !== undefined ? balance.balanceUSD : 0
        )}`,
        yield: `${
          yieldObject !== undefined ? yieldObject?.apy.toFixed(2) + "%" : "-"
        }`,
        il: `${yieldObject !== undefined ? yieldObject?.ilRisk : "-"}`,
      });
    }

    console.table(data);
  }
}

main();
