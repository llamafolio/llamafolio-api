import path from "path";
import fetch from "node-fetch";
import millify from "millify";

import { toDefiLlama } from "../src/lib/chain";
import {
  Adapter,
  Balance,
  BaseContext,
  PricedBalance,
} from "../src/lib/adapter";
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

  //console.log("All balances:", JSON.stringify(balances));

  // Filter empty nbalances
  balances = balances.filter((balance) => balance.amount.gt(0));


  const response = await fetch('https://yields.llama.fi/pools');
  const yieldsDetails = (await response.json()).data;

  const formattedYields = []
  for (let index = 0; index < yieldsDetails.length; index++) {
    formattedYields[yieldsDetails[index].pool.toLowerCase()] = yieldsDetails[index]
  }

  const prices = await getERC20Prices(balances);

  const pricedBalances: (Balance | PricedBalance)[] = balances.map(
    (balance) => {
      const key = `${balance.chain}:${(balance.priceSubstitute)?balance.priceSubstitute.toLowerCase():balance.address.toLowerCase()}`;
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
          `Failed to get price on Defillama API for ${key}`
        );
      }
      return balance;
    }
  );


  console.log(`Found ${pricedBalances.length} non zero balances`)
  const data = []


  for (let index = 0; index < pricedBalances.length; index++) {
    const balance = pricedBalances[index];

    const key = `${balance.yieldsAddress?.toLowerCase()}-${balance.chain}`
    const subKey = `${balance.yieldsAddress?.toLowerCase()}`
    const yieldObject = formattedYields[key] || formattedYields[subKey]
    data.push({
      address: balance.address,
      category: balance.category,
      token: balance.symbol,
      balance: millify(balance.amount / 10 ** balance.decimals),
      'balance usd': `$${millify((balance.balanceUSD !== undefined)?balance.balanceUSD:0)}`,
      'yield': `${(yieldObject !== undefined)?yieldObject?.apy.toFixed(2)+"%":'-'}`,
      'il': `${(yieldObject !== undefined)?yieldObject?.ilRisk:'-'}`,
      parent: `${balance.parent}`,
    })
    if (balance.rewards) {
      data.push({
        address: balance.address,
        category: balance.rewards.category,
        token: balance.symbol,
        balance: millify(balance.amount / 10 ** balance.decimals),
        'balance usd': millify((balance.balanceUSD !== undefined)?balance.balanceUSD:0),
        'yield': `-`,
        'il': `-`,
        parent: `${balance.parent}`,
      })
    }

  }

  console.table(data)
}

main();
